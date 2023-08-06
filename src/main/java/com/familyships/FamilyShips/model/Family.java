package com.familyships.FamilyShips.model;

import java.util.Set;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;

@Entity
public class Family {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id = null;

    @OneToMany(mappedBy = "family")
    private Set<FamilyParent> parents; 

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Set<FamilyParent> getParents() {
        return parents;
    }

    public void setParents(Set<FamilyParent> parents) {
        this.parents = parents;
    }

    public Set<FamilyChild> getChildren() {
        return children;
    }

    public void setChildren(Set<FamilyChild> children) {
        this.children = children;
    }

    @OneToMany(mappedBy = "family")
    private Set<FamilyChild> children;

}
