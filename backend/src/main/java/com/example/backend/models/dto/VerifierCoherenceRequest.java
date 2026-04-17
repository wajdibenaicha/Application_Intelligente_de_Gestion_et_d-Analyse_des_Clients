package com.example.backend.models.dto;
import java.util.List;

public record VerifierCoherenceRequest(
    String titre,
    List<String> existingTitles
) {}
