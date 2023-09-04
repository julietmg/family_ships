package com.familyships.FamilyShips.model;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.ElementCollection;
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

    @ElementCollection
    private List<String> names;
    
    // may be >1 if not sure which one
    @OneToMany(mappedBy = "child")
    @JsonManagedReference
    private Set<FamilyChild> childOfFamily;

    @OneToMany(mappedBy = "parent")
    @JsonManagedReference
    private Set<FamilyParent> parentOfFamily;

    @JsonIgnore
    public Set<FamilyChild> getChildOfFamily() {
        return childOfFamily;
    }

    @JsonIgnore
    public Set<FamilyParent> getParentOfFamily() {
        return parentOfFamily;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Collection<String> getNames() {
        return names != null ? names : Collections.<String>emptyList();
    }

    public void setNames(List<String> names) {
        this.names = names;
    }

    public void addName(String name) {
        if (names == null) {
            names = new ArrayList<String>();
        }
        names.add(name);
    }

    public Set<Integer> getChildOfFamiliesIds() {
        return childOfFamily.stream().map((family_child) -> family_child.getFamily().getId())
                .collect(Collectors.toSet());
    }

    public Set<Integer> getParentOfFamilyIds() {
        return parentOfFamily.stream().map((family_parent) -> family_parent.getFamily().getId())
                .collect(Collectors.toSet());
    }

    @Override
    public String toString() {
        return "Person [id=" + id + ", names=" + names + ", childOffamily=" + getChildOfFamiliesIds() + ", parentOfFamily="
                + getParentOfFamilyIds() + "]";
    }
}
