package com.example.backend.config;

import com.twilio.Twilio;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TwilioConfig {
    @Value("${twilio.account-sid}") private String sid;
    @Value("${twilio.auth-token}") private String token;

    @PostConstruct
    public void init() { Twilio.init(sid, token); }
}
