package com.familyships.FamilyShips.model;

import java.util.Set;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;


@Entity
public class Tree {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;

    @OneToMany
    private Set<Person> people;

    @OneToMany
    private Set<Family> families;
    
    public Set<Person> getPeople() {
        return people;
    }

    public void addPerson(Person person) {
        people.add(person);
    }

     public void addFamily(Family family) {
        families.add(family);
    }

    public Set<Family> getFamilies() {
        return families;
    }

    public void deleteFamily(Family family) {
        families.remove(family);
    }

    public void deletePerson(Person person) {
        people.remove(person);
    }
}
