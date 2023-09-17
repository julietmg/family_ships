package com.familyships.FamilyShips.authentication;

import java.util.Set;

import com.familyships.FamilyShips.model.Tree;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;

@Entity 
public class User {
  @Id
  @GeneratedValue(strategy=GenerationType.AUTO)
  private Integer id;

  @OneToOne
  private Tree tree;
  
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

  public void attachTree(Tree tree) {
    this.tree = tree;
  }

  public Tree getTree() {
    return this.tree;
  }
}