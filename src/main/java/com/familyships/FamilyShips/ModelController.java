package com.familyships.FamilyShips;

import java.security.Principal;
import java.util.ArrayList;
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

    // TODO: Get rid of debug endpoints in the production version
    @GetMapping("/model/debug/people")
    public List<Person> people() {
        List<Person> result = new ArrayList<Person>();
        for (Person person : personRepository.findAll()) {
            result.add(person);
        }
        return result;
    }

    // TODO: Get rid of debug endpoints in the production version
    @GetMapping("/model/debug/families")
    public List<Family> families() {
        List<Family> result = new ArrayList<Family>();
        for (Family family : familyRepository.findAll()) {
            result.add(family);
        }
        return result;
    }

    // TODO: Allow for updating the data about the person.
    @PostMapping("/model/new_person")
    public String newPerson(@RequestParam String name, Principal principal) {
        // TODO: Authorization
        Person person = new Person();
        person.setNames(Collections.singleton(name));
        personRepository.save(person);
        return name + " added with id " + person.getId();
    }

    @PostMapping("/model/delete_person")
    public String deletePerson(@RequestParam Integer id, Principal principal) {
        // TODO: Authorization
        Optional<Person> maybePerson = personRepository.findById(id);
        if (!maybePerson.isPresent()) {
            return "No person with id " + id;
        }
        Person person = maybePerson.get();

        // When we delete a person we delete all of its relationships first
        for (FamilyChild familyChild : person.getChildOfFamily()) {
            familyChildRepository.delete(familyChild);
        }

        for (FamilyParent familyParent : person.getParentOfFamily()) {
            familyParentRepository.delete(familyParent);
        }

        String deletedPersonName = person.getFormattedNames();
        personRepository.delete(person);
        return deletedPersonName + " was deleted";
    }

    @PostMapping("/model/new_family")
    public String newFamily(Principal principal) {
        // TODO: Authorization
        Family family = new Family();
        familyRepository.save(family);
        return "New family created with id " + family.getId();
    }

    @PostMapping("/model/delete_family")
    public String deleteFamily(@RequestParam Integer id, Principal principal) {
        // TODO: Authorization
        Optional<Family> maybeFamily = familyRepository.findById(id);
        if (!maybeFamily.isPresent()) {
            return "No person with id " + id;
        }
        Family family = maybeFamily.get();

        // When we delete a person we delete all of its relationships first
        for (FamilyChild familyChild : family.getChildren()) {
            familyChildRepository.delete(familyChild);
        }

        for (FamilyParent familyParent : family.getParents()) {
            familyParentRepository.delete(familyParent);
        }

        String deletedFamilyId = family.getId().toString();
        familyRepository.delete(family);
        return deletedFamilyId + " was deleted";
    }

    @PostMapping(value = "/model/new_family_child")
    public String newFamilyChild(@RequestParam Integer familyId,
            @RequestParam Integer childId,
            Principal principal) {
        FamilyChildKey familyChildKey = new FamilyChildKey();
        familyChildKey.setChildId(childId);
        familyChildKey.setFamilyId(familyId);
        FamilyChild familyChild = new FamilyChild();
        familyChild.setId(familyChildKey);
        // TODO: Validate input
        // TODO: Ensure no cycles.
        Person child = personRepository.findById(childId).get();
        Family family = familyRepository.findById(familyId).get();
        familyChild.setChild(child);
        familyChild.setFamily(family);
        familyChildRepository.save(familyChild);
        return child.getFormattedNames() + " added as a child to family with id " + family.getId();
    }

    @PostMapping("/model/new_family_parent")
    public @ResponseBody String newFamilyParent(@RequestParam Integer familyId,
            @RequestParam Integer parentId,
            Principal principal) {
        // TODO: Constructors to make this code nicer.
        // TODO: CLEANUP
        FamilyParentKey FamilyParentKey = new FamilyParentKey();
        FamilyParentKey.setFamilyId(familyId);
        FamilyParentKey.setParentId(parentId);
        FamilyParent familyParent = new FamilyParent();
        familyParent.setId(FamilyParentKey);
        // TODO: Validate input
        // TODO: Ensure no cycles.
        Person parent = personRepository.findById(parentId).get();
        Family family = familyRepository.findById(familyId).get();
        familyParent.setFamily(family);
        familyParent.setParent(parent);
        familyParentRepository.save(familyParent);
        return parent.getFormattedNames() + " added as a parent to family with id " + family.getId();
    }

}
