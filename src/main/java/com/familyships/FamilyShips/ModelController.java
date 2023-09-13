package com.familyships.FamilyShips;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

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

@RestController
public class ModelController {
    @Autowired
    private PersonRepository personRepository;
    @Autowired
    private FamilyRepository familyRepository;
    @Autowired
    private FamilyChildRepository familyChildRepository;
    @Autowired
    private FamilyParentRepository familyParentRepository;

    // /model/people
    // Input: No input
    // Output: list of people, where person is personId,names,parentOfFamiliesIds,childOfFamiliesIds
    @GetMapping("/model/people")
    public @ResponseBody List<Person> people() {
        List<Person> result = new ArrayList<Person>();
        for (Person person : personRepository.findAll()) {
            result.add(person);
        }
        return result;
    }

    // /model/families
    // Input: No input
    // Output: list of families, where a family consists of familyId,children,parents
    @GetMapping("/model/families")
    public @ResponseBody List<Family> families() {
        List<Family> result = new ArrayList<Family>();
        for (Family family : familyRepository.findAll()) {
            result.add(family);
        }
        return result;
    }

    // /model/new_person
    // Input: spaceSeparatedNames
    // Output: personId
    @PostMapping("/model/new_person")
    public @ResponseBody Integer newPerson(@RequestParam String spaceSeparatedNames, Principal principal) {
        // TODO: Authorization
        List<String> names = Arrays.asList(spaceSeparatedNames.split(" "));
        Person person = new Person();
        person.setNames(names);
        person = personRepository.save(person);
        return person.getId();
    }

    // /model/delete_person
    // Input: personId
    // Output: whether deleted or not
    @PostMapping("/model/delete_person")
    public @ResponseBody boolean deletePerson(@RequestParam Integer personId, Principal principal) {
        // TODO: Authorization
        Optional<Person> maybePerson = personRepository.findById(personId);
        if (!maybePerson.isPresent()) {
            return false;
        }
        Person person = maybePerson.get();

        // When we delete a person we delete all of its relationships first
        for (FamilyChild familyChild : person.getChildOfFamily()) {
            familyChildRepository.delete(familyChild);
        }

        for (FamilyParent familyParent : person.getParentOfFamily()) {
            familyParentRepository.delete(familyParent);
        }
        personRepository.delete(person);
        return true;
    }

    // /model/new_family
    // Input: No input
    // Output: familyId
    @PostMapping("/model/new_family")
    public @ResponseBody Integer newFamily(Principal principal) {
        // TODO: Authorization
        Family family = new Family();
        family = familyRepository.save(family);
        return family.getId();
    }

    // /model/delete_family
    // Input: familyId
    // Output: whether deleted or not
    @PostMapping("/model/delete_family")
    public @ResponseBody boolean deleteFamily(@RequestParam Integer familyId, Principal principal) {
        // TODO: Authorization
        Optional<Family> maybeFamily = familyRepository.findById(familyId);
        if (!maybeFamily.isPresent()) {
            return false;
        }
        Family family = maybeFamily.get();

        // When we delete a person we delete all of its relationships first
        for (FamilyChild familyChild : family.getChildren()) {
            familyChildRepository.delete(familyChild);
        }

        for (FamilyParent familyParent : family.getParents()) {
            familyParentRepository.delete(familyParent);
        }

        familyRepository.delete(family);
        return true;
    }

    // /model/attach_child
    // Input: personId, familyId
    // Output: whether attached or not
    @PostMapping(value = "/model/attach_child")
    public @ResponseBody boolean attachChild(@RequestParam Integer familyId,
            @RequestParam Integer childId,
            Principal principal) {
        FamilyChildKey familyChildKey = new FamilyChildKey(familyId, childId);
        FamilyChild familyChild = new FamilyChild(familyChildKey);
        // TODO: Validate input
        // TODO: Ensure no cycles.
        Person child = personRepository.findById(childId).get();
        Family family = familyRepository.findById(familyId).get();
        familyChild.setChild(child);
        familyChild.setFamily(family);
        familyChildRepository.save(familyChild);
        return true;
    }

    // /model/detach_child
    // Input: personId, familyId
    // Output: whether detached or not
    @PostMapping(value = "/model/detach_child")
    public @ResponseBody boolean detachChild(@RequestParam Integer familyId,
            @RequestParam Integer childId,
            Principal principal) {
        FamilyChildKey familyChildKey = new FamilyChildKey(familyId, childId);
        familyChildRepository.deleteById(familyChildKey);
        return true;
    }

    // /model/attach_parent
    // Input: personId, familyId
    // Output: whether attached or not
    @PostMapping("/model/attach_parent")
    public @ResponseBody boolean attachParent(@RequestParam Integer familyId,
            @RequestParam Integer parentId,
            Principal principal) {
        FamilyParentKey familyParentKey = new FamilyParentKey(familyId, parentId);
        FamilyParent familyParent = new FamilyParent(familyParentKey);
        // TODO: Validate input
        // TODO: Ensure no cycles.
        Person parent = personRepository.findById(parentId).get();
        Family family = familyRepository.findById(familyId).get();
        familyParent.setFamily(family);
        familyParent.setParent(parent);
        familyParentRepository.save(familyParent);
        return true;
    }

    // /model/detach_parent
    // Input: personId, familyId
    // Output: whether detached or not
    @PostMapping("/model/detach_parent")
    public @ResponseBody boolean detachParent(@RequestParam Integer familyId,
            @RequestParam Integer parentId,
            Principal principal) {
        FamilyParentKey familyParentKey = new FamilyParentKey(familyId, parentId);
        familyParentRepository.deleteById(familyParentKey);
        return true;
    }

    // /model/set_names
    // Input: personId, spaceSeparatedNames
    // Output: whether the names were set or not
    @PostMapping("/model/set_names")
    public @ResponseBody boolean setNames(@RequestParam Integer personId,
            @RequestParam String spaceSeparatedNames,
            Principal principal) {
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
