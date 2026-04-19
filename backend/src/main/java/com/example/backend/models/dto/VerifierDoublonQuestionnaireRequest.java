package com.example.backend.models.dto;

import java.util.List;

public record VerifierDoublonQuestionnaireRequest(
    String titre,
    String description,
    List<String> existingTitles
) {}
