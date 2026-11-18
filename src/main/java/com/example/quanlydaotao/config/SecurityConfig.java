package com.example.quanlydaotao.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // trang tĩnh gọi fetch; bật lại nếu làm form chuẩn
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/login.html", "/assets/**", "/adminlte/**", "/favicon.ico").permitAll()
                .anyRequest().authenticated())
            .formLogin(f -> f
                .loginPage("/login.html")
                .loginProcessingUrl("/login")
                .defaultSuccessUrl("/index.html", true)
                .failureUrl("/login.html?error"))
            .logout(l -> l.logoutUrl("/logout").logoutSuccessUrl("/login.html"));
        return http.build();
    }

    @Bean
    UserDetailsService users(@Value("${app.admin.username}") String u,
                             @Value("${app.admin.password}") String p,
                             PasswordEncoder enc) {
        return new InMemoryUserDetailsManager(
            User.withUsername(u).password(enc.encode(p)).roles("ADMIN").build());
    }

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
}