package com.familyships.FamilyShips.model;

import java.util.Set;

import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;

// TODO: Remember to have something that cleans up empty families!
@Entity
public class Family {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id = null;

    @OneToMany(mappedBy = "family")
    @JsonManagedReference
    private Set<FamilyParent> parents; 

    @OneToMany(mappedBy = "family")
    @JsonManagedReference
    private Set<FamilyChild> children;

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

    @Override
    public String toString() {
        return "Family [id=" + id + ", parents=" + parents + ", children=" + children + "]";
    }
}
