package com.familyships.FamilyShips.authentication;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import com.familyships.FamilyShips.authentication.User;

public interface UserRepository extends CrudRepository<User, Integer> {
    @Query("SELECT u FROM User u WHERE u.googleSub = ?1")
    User findByGoogleSub(String googleSub);

    @Query("SELECT u FROM User u WHERE u.gitLogin = ?1")
    User findByGitLogin(String gitLogin);
}