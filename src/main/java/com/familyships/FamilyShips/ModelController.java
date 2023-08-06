package com.familyships.FamilyShips;


import java.security.Principal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.familyships.FamilyShips.model.Person;
import com.familyships.FamilyShips.model.PersonRepository;

import jakarta.persistence.CollectionTable;

@RestController
public class ModelController {
    @Autowired
    private PersonRepository personRepository;

    @GetMapping("/model/people")
    public List<Person> people() {
        List<Person> result = new ArrayList<Person>();
        for(Person person : personRepository.findAll()) {
            result.add(person);
        }
        return result;
    }

    @PostMapping("/model/people")
    public Person newPerson(@RequestBody String name, Principal principal) {
        // TODO: Authorization
        Person person = new Person();
        person.setNames(Collections.singleton(name));
        return personRepository.save(person);
    }


}
