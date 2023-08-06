package com.familyships.FamilyShips.model;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;


@Embeddable
public class FamilyParentKey implements Serializable {
    
    @Column(name = "family_id")
    private Integer familyId;


    @Column(name = "parent_id")
    private Integer parentId;

    public Integer getFamilyId() {
        return familyId;
    }

    public void setFamilyId(Integer familyId) {
        this.familyId = familyId;
    }

    public Integer getParentId() {
        return parentId;
    }

    public void setParentId(Integer parentId) {
        this.parentId = parentId;
    }

    @Override
    public String toString() {
        return "FamilyParentKey [familyId=" + familyId + ", parentId=" + parentId + "]";
    }
}
