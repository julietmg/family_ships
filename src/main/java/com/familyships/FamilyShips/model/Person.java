package com.familyships.FamilyShips.model;

import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;

@Entity
public class Person {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;
    private Set<String> names;

    // may be >1 if not sure which one
    @OneToMany(mappedBy = "child")
    private Set<FamilyChild> childOffamily;

    @OneToMany(mappedBy = "parent")
    private Set<FamilyParent> parentOfFamily;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Collection<String> getNames() {
        return names != null ? names : Collections.<String>emptyList();
    }

    public void setNames(Set<String> names) {
        this.names = names;
    }

    public void addName(String name) {
        if (names == null) {
            names = new HashSet<String>();
        }
        names.add(name);
    }
}
