package com.familyships.FamilyShips.model;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class FamilyChildKey implements Serializable {

    @Column(name = "family_id")
    private Integer familyId;

    @Column(name = "child_id")
    private Integer childId;

    public Integer getFamilyId() {
        return familyId;
    }

    public void setFamilyId(Integer familyId) {
        this.familyId = familyId;
    }

    public Integer getChildId() {
        return childId;
    }

    public void setChildId(Integer childId) {
        this.childId = childId;
    }

    @Override
    public String toString() {
        return "FamilyChildKey [familyId=" + familyId + ", childId=" + childId + "]";
    }


}
