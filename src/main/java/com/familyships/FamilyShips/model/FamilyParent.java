package com.familyships.FamilyShips.model;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
  private Family family;

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

  @ManyToOne
  @MapsId("parentId")
  @JoinColumn(name = "parent_id")
  private Person parent;
}
