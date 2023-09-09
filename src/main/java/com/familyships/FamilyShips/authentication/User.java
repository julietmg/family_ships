package com.familyships.FamilyShips.authentication;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity 
public class User {
  @Id
  @GeneratedValue(strategy=GenerationType.AUTO)
  private Integer id;
  
  // Identifier for people logged in with Google
  private String googleSub;
  // Identifier for people logged in with Git
  private String gitLogin;
  // Name is just a neat identifier to show on top of the page.
  private String name;

  public Integer getId() {
    return id;
  }

  public void setId(Integer id) {
    this.id = id;
  }

   public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getGoogleSub() {
    return googleSub;
  }

  public void setGoogleSub(String googleSub) {
    this.googleSub = googleSub;
  }

  public String getGitLogin() {
    return gitLogin;
  }

  public void setGitLogin(String gitLogin) {
    this.gitLogin = gitLogin;
  }
}