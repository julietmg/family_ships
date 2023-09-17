package com.familyships.FamilyShips;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import com.familyships.FamilyShips.authentication.AuthenticationController.UnknownUserIdentifierException;
import com.familyships.FamilyShips.authentication.User;
import com.familyships.FamilyShips.authentication.UserRepository;
import com.familyships.FamilyShips.model.Family;
import com.familyships.FamilyShips.model.FamilyChild;
import com.familyships.FamilyShips.model.FamilyChildKey;
import com.familyships.FamilyShips.model.FamilyChildRepository;
import com.familyships.FamilyShips.model.FamilyParent;
import com.familyships.FamilyShips.model.FamilyParentKey;
import com.familyships.FamilyShips.model.FamilyParentRepository;
import com.familyships.FamilyShips.model.FamilyRepository;
import com.familyships.FamilyShips.model.Person;
import com.familyships.FamilyShips.model.PersonRepository;
import com.familyships.FamilyShips.model.Tree;
import com.familyships.FamilyShips.model.TreeRepository;

@RestController
@RequestMapping(path = "/model")
public class ModelController {
    @Autowired
    private PersonRepository personRepository;
    @Autowired
    private FamilyRepository familyRepository;
    @Autowired
    private FamilyChildRepository familyChildRepository;
    @Autowired
    private FamilyParentRepository familyParentRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TreeRepository treeRepository;

    Tree getTreeForPrincipal(OAuth2User principal) throws Exception {
        User user = null;
        String googleSub = principal.getAttribute("sub");
        if (googleSub != null) {
            user = userRepository.findByGoogleSub(googleSub);
        }
        String gitLogin = principal.getAttribute("login");
        if (gitLogin != null) {
            // There is no clear documentation on the Git side which attribute should be
            // used to identify the user so using the git login here.
            user = userRepository.findByGitLogin(gitLogin);
        }
        if (user == null) {
            throw new Exception("User is not registered.");
        }
        return user.getTree();
    }

    // /model/people
    // Input: No input
    // Output: list of people, where person is
    // personId,names,parentOfFamiliesIds,childOfFamiliesIds
    @GetMapping("/people")
    public @ResponseBody List<Person> people(@AuthenticationPrincipal OAuth2User principal) throws Exception {
        Tree tree = getTreeForPrincipal(principal);
        List<Person> result = new ArrayList<Person>();
        for (Person person : tree.getPeople()) {
            result.add(person);
        }
        return result;
    }

    // /model/families
    // Input: No input
    // Output: list of families, where a family consists of
    // familyId,children,parents
    @GetMapping("/families")
    public @ResponseBody List<Family> families(@AuthenticationPrincipal OAuth2User principal) throws Exception {
        Tree tree = getTreeForPrincipal(principal);
        List<Family> result = new ArrayList<Family>();
        for (Family family : tree.getFamilies()) {
            result.add(family);
        }
        return result;
    }

    // /model/new_person
    // Input: spaceSeparatedNames
    // Output: personId
    @PostMapping("/new_person")
    public @ResponseBody Integer newPerson(@RequestParam String spaceSeparatedNames,
            @AuthenticationPrincipal OAuth2User principal) throws Exception {
        Tree tree = getTreeForPrincipal(principal);
        List<String> names = Arrays.asList(spaceSeparatedNames.split(" "));
        Person person = new Person();
        person.setNames(names);
        person = personRepository.save(person);
        tree.addPerson(person);
        treeRepository.save(tree);
        return person.getId();
    }

    // /model/delete_person
    // Input: personId
    // Output: whether deleted or not
    @PostMapping("/delete_person")
    public @ResponseBody boolean deletePerson(@RequestParam Integer personId,
            @AuthenticationPrincipal OAuth2User principal) throws Exception {
        Tree tree = getTreeForPrincipal(principal);
        Optional<Person> maybePerson = personRepository.findById(personId);
        if (!maybePerson.isPresent()) {
            return false;
        }
        Person person = maybePerson.get();
        if (!tree.getPeople().contains(person)) {
            return false;
        }

        // When we delete a person we delete all of its relationships first
        for (FamilyChild familyChild : person.getChildOfFamily()) {
            familyChildRepository.delete(familyChild);
        }

        for (FamilyParent familyParent : person.getParentOfFamily()) {
            familyParentRepository.delete(familyParent);
        }
        tree.deletePerson(person);
        treeRepository.save(tree);
        personRepository.delete(person);
        return true;
    }

    // /model/new_family
    // Input: No input
    // Output: familyId
    @PostMapping("/new_family")
    public @ResponseBody Integer newFamily(@AuthenticationPrincipal OAuth2User principal) throws Exception {
        Tree tree = getTreeForPrincipal(principal);
        Family family = new Family();
        family = familyRepository.save(family);
        tree.addFamily(family);
        treeRepository.save(tree);
        return family.getId();
    }

    // /model/delete_family
    // Input: familyId
    // Output: whether deleted or not
    @PostMapping("/delete_family")
    public @ResponseBody boolean deleteFamily(@RequestParam Integer familyId,
            @AuthenticationPrincipal OAuth2User principal) throws Exception {
        Tree tree = getTreeForPrincipal(principal);
        Optional<Family> maybeFamily = familyRepository.findById(familyId);
        if (!maybeFamily.isPresent()) {
            return false;
        }
        Family family = maybeFamily.get();
        if (!tree.getFamilies().contains((family))) {
            return false;
        }

        // When we delete a person we delete all of its relationships first
        for (FamilyChild familyChild : family.getChildren()) {
            familyChildRepository.delete(familyChild);
        }

        for (FamilyParent familyParent : family.getParents()) {
            familyParentRepository.delete(familyParent);
        }

        tree.deleteFamily(family);
        treeRepository.save(tree);
        familyRepository.delete(family);
        return true;
    }

    // /model/attach_child
    // Input: personId, familyId
    // Output: whether attached or not
    @PostMapping(value = "/attach_child")
    public @ResponseBody boolean attachChild(@RequestParam Integer familyId,
            @RequestParam Integer childId,
            @AuthenticationPrincipal OAuth2User principal) throws Exception {
        Tree tree = getTreeForPrincipal(principal);
        FamilyChildKey familyChildKey = new FamilyChildKey(familyId, childId);
        FamilyChild familyChild = new FamilyChild(familyChildKey);
        Person child = personRepository.findById(childId).get();
        Family family = familyRepository.findById(familyId).get();
        if (!tree.getFamilies().contains((family))) {
            return false;
        }
        if (!tree.getPeople().contains((child))) {
            return false;
        }
        familyChild.setChild(child);
        familyChild.setFamily(family);
        familyChildRepository.save(familyChild);
        return true;
    }

    // /model/detach_child
    // Input: personId, familyId
    // Output: whether detached or not
    @PostMapping(value = "/detach_child")
    public @ResponseBody boolean detachChild(@RequestParam Integer familyId,
            @RequestParam Integer childId,
            @AuthenticationPrincipal OAuth2User principal) throws Exception {
        Tree tree = getTreeForPrincipal(principal);
        if (!tree.getPeople().contains((personRepository.findById(childId).get()))) {
            return false;
        }
        if (!tree.getFamilies().contains((familyRepository.findById(familyId).get()))) {
            return false;
        }
        FamilyChildKey familyChildKey = new FamilyChildKey(familyId, childId);
        familyChildRepository.deleteById(familyChildKey);

        Family family = familyRepository.findById(familyId).get();
        if(family.getChildren().size() == 0 && family.getParents().size() == 0) {
            tree.deleteFamily(family);
            treeRepository.save(tree);
            familyRepository.delete(family);
        }
        return true;
    }

    // /model/attach_parent
    // Input: personId, familyId
    // Output: whether attached or not
    @PostMapping("/attach_parent")
    public @ResponseBody boolean attachParent(@RequestParam Integer familyId,
            @RequestParam Integer parentId,
            @AuthenticationPrincipal OAuth2User principal) throws Exception {
        Tree tree = getTreeForPrincipal(principal);

        FamilyParentKey familyParentKey = new FamilyParentKey(familyId, parentId);
        FamilyParent familyParent = new FamilyParent(familyParentKey);
        Person parent = personRepository.findById(parentId).get();
        Family family = familyRepository.findById(familyId).get();
        if (!tree.getPeople().contains(parent)) {
            return false;
        }
        if (!tree.getFamilies().contains(family)) {
            return false;
        }
        familyParent.setFamily(family);
        familyParent.setParent(parent);
        familyParentRepository.save(familyParent);
        return true;
    }

    // /model/detach_parent
    // Input: personId, familyId
    // Output: whether detached or not
    @PostMapping("/detach_parent")
    public @ResponseBody boolean detachParent(@RequestParam Integer familyId,
            @RequestParam Integer parentId,
            @AuthenticationPrincipal OAuth2User principal) throws Exception {
        Tree tree = getTreeForPrincipal(principal);
        if (!tree.getPeople().contains((personRepository.findById(parentId).get()))) {
            return false;
        }
        if (!tree.getFamilies().contains((familyRepository.findById(familyId).get()))) {
            return false;
        }
        FamilyParentKey familyParentKey = new FamilyParentKey(familyId, parentId);
        familyParentRepository.deleteById(familyParentKey);
        Family family = familyRepository.findById(familyId).get();
        if(family.getChildren().size() == 0 && family.getParents().size() == 0) {
            tree.deleteFamily(family);
            treeRepository.save(tree);
            familyRepository.delete(family);
        }
        return true;
    }

    // /model/set_names
    // Input: personId, spaceSeparatedNames
    // Output: whether the names were set or not
    @PostMapping("/set_names")
    public @ResponseBody boolean setNames(@RequestParam Integer personId,
            @RequestParam String spaceSeparatedNames,
            @AuthenticationPrincipal OAuth2User principal) throws Exception {
        Tree tree = getTreeForPrincipal(principal);
        if (!tree.getPeople().contains((personRepository.findById(personId).get()))) {
            return false;
        }
        List<String> names = new ArrayList<String>(List.of(spaceSeparatedNames.split(" ")));
        Optional<Person> maybePerson = personRepository.findById(personId);
        if (!maybePerson.isPresent()) {
            return false;
        }
        Person person = maybePerson.get();
        person.setNames(names);
        personRepository.save(person);
        return true;
    }
}
