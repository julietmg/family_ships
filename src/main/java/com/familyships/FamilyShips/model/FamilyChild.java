package com.familyships.FamilyShips.model;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;

@Entity
public class FamilyChild {

  @EmbeddedId
  private FamilyChildKey id;

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

  @ManyToOne
  @MapsId("familyId")
  @JoinColumn(name = "family_id")
  private Family family;

  @ManyToOne
  @MapsId("childId")
  @JoinColumn(name = "child_id")
  private Person child;
}
