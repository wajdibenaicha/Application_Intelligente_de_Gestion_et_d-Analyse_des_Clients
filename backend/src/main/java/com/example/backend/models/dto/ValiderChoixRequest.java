package com.example.backend.models.dto;
import java.util.List;

public record ValiderChoixRequest(
    String titre,
    String type,
    List<String> options
) {}
