package com.familyships.FamilyShips.authentication;

import java.util.Collections;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping(path = "/auth")
public class AuthenticationController {
    @Autowired
    private UserRepository userRepository;

    public class UnknownUserIdentifierException extends Exception {
    }

    // TODO: Get rid of this endpoint in production
    @GetMapping(path = "/debug")
    public @ResponseBody Map<String, Object> debug(@AuthenticationPrincipal OAuth2User principal) {
        
        return principal.getAttributes();
    }

    @GetMapping("/id")
    public @ResponseBody Map<String, Object> id(@AuthenticationPrincipal OAuth2User principal) throws UnknownUserIdentifierException {
        String googleSub = principal.getAttribute("sub");
        if (googleSub != null) {
            // Based on https://developers.google.com/identity/openid-connect/openid-connect
            // The sub attribute should be used to identify the users.
            User user = userRepository.findByGoogleSub(googleSub);
            if (user == null) {
                user = new User();
                user.setGoogleSub(googleSub);
                user.setName(principal.getAttribute("given_name"));
                userRepository.save(user);
            }

            return Collections.singletonMap("name", user.getName());
        }

        String gitLogin = principal.getAttribute("login");
        if (gitLogin != null) {
            // There is no clear documentation on the Git side which attribute should be
            // used to identify the user so using the git login here.
            User user = userRepository.findByGitLogin(gitLogin);
            if (user == null) {
                user = new User();
                user.setGitLogin(gitLogin);
                 user.setName(principal.getAttribute("name"));
                userRepository.save(user);
            }
            return Collections.singletonMap("name", user.getName());

        }
        throw new UnknownUserIdentifierException();
    }
}
