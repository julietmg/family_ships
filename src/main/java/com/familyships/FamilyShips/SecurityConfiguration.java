package com.familyships.FamilyShips;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

@Configuration
public class SecurityConfiguration {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/", "/error", "/webjars/**", "/index.html", "/familyships.png", "/icons/familyships.svg", "/tree/logo.js", "/style.css", "/icons/github.svg", "/icons/google.svg").permitAll()
                        .anyRequest().authenticated())
                        
                .logout(l -> l
                        .logoutSuccessUrl("/").logoutUrl("/logout").permitAll())
                        
                .csrf().disable()
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .oauth2Login()

        ;
        return http.build();
    }

}
