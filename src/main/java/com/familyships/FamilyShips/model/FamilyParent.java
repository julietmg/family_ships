package com.familyships.FamilyShips.model;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;

@Entity
public class FamilyParent {
  @EmbeddedId
  private FamilyParentKey id;

  @ManyToOne
  @MapsId("familyId")
  @JoinColumn(name = "family_id")
  @JsonBackReference
  private Family family;

  @ManyToOne
  @MapsId("parentId")
  @JsonBackReference
  @JoinColumn(name = "parent_id")
  private Person parent;

  // TODO: Represent all of:
  // * XY chromosome parent
  // * XX chromosome parent
  // * adoption

  public FamilyParentKey getId() {
    return id;
  }

  public void setId(FamilyParentKey id) {
    this.id = id;
  }

  public Family getFamily() {
    return family;
  }

  public void setFamily(Family family) {
    this.family = family;
  }

  public Person getParent() {
    return parent;
  }

  public void setParent(Person parent) {
    this.parent = parent;
  }

  @Override
  public String toString() {
    return "FamilyParent [id=" + id + ", family=" + family.getId() + ", parent=" + parent + "]";
  }
}
