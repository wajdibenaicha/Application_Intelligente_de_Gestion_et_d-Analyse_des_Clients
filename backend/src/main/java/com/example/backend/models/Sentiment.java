package com.example.backend.models;

public enum Sentiment {
    VERY_NEGATIVE,  
    NEGATIVE,       
    NEUTRAL,        
    POSITIVE,       
    VERY_POSITIVE; 

    public static Sentiment fromScore(double score) {
        if (score <= 20) return VERY_NEGATIVE;
        if (score <= 40) return NEGATIVE;
        if (score <= 60) return NEUTRAL;
        if (score <= 80) return POSITIVE;
        return VERY_POSITIVE;
    }
}
