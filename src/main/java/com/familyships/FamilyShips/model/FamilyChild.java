package com.familyships.FamilyShips.model;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;

@Entity
public class FamilyChild {

  @EmbeddedId
  private FamilyChildKey id;
  
  @ManyToOne
  @MapsId("familyId")
  @JoinColumn(name = "family_id")
    @JsonBackReference
  private Family family;

  @ManyToOne
  @MapsId("childId")
  @JoinColumn(name = "child_id")
    @JsonBackReference
  private Person child;

  public FamilyChildKey getId() {
    return id;
  }

  public void setId(FamilyChildKey id) {
    this.id = id;
  }

  public Family getFamily() {
    return family;
  }

  public void setFamily(Family family) {
    this.family = family;
  }

  public Person getChild() {
    return child;
  }

  public void setChild(Person child) {
    this.child = child;
  }

  @Override
  public String toString() {
    return "FamilyChild [id=" + id + ", family_id=" + family.getId() + ", child_id=" + child + "]";
  }
}
