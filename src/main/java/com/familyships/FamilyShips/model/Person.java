package com.familyships.FamilyShips.model;

import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

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
    private Set<FamilyChild> childOfFamily;

    @OneToMany(mappedBy = "parent")
    private Set<FamilyParent> parentOfFamily;

    public Set<FamilyChild> getChildOfFamily() {
        return childOfFamily;
    }

    public Set<FamilyParent> getParentOfFamily() {
        return parentOfFamily;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getFormattedNames() {
        return names.stream().collect(Collectors.joining(" "));
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

    private Set<Integer> childOfFamiliesIds() {
        return childOfFamily.stream().map((family_child) -> family_child.getFamily().getId()).collect(Collectors.toSet());
    }

    private Set<Integer> parentOfFamilyIds() {
        return parentOfFamily.stream().map((family_parent) -> family_parent.getFamily().getId()).collect(Collectors.toSet());
    }

    @Override
    public String toString() {
        return "Person [id=" + id + ", names=" + names + ", childOffamily=" + childOfFamiliesIds() + ", parentOfFamily="
                + parentOfFamilyIds() + "]";
    }
}
