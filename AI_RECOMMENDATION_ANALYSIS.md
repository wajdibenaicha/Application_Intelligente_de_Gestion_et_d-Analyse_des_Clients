# AI & Offer Recommendation System - Complete Analysis

## Overview
The application implements an intelligent recommendation engine using **Google Gemini AI** for offer suggestions based on customer KPI analysis. The system has two primary flows:
1. **KPI-Based Recommendations** - Rule-based offering based on customer satisfaction scores
2. **AI-Enhanced Questionnaire** - Gemini AI for survey optimization and duplicate detection

---

## 1. AI Models & Integrations

### Primary AI Provider: Google Gemini
- **Model**: `gemini-2.0-flash` (latest Flash model)
- **API URL**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **Configuration** (application.properties):
  ```properties
  ai.enabled=true
  ai.provider=gemini
  ai.api-key=YOUR_GROQ_API_KEY_HERE
  ai.model=gemini-2.0-flash
  ai.api-url=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
  ```

### AI Temperature Settings
- **Recommendation Analysis**: `temperature: 0.3` (deterministic, focused)
- **Question Reformulation**: `temperature: 0.3` (consistent, reliable)

---

## 2. AI Services & Algorithms

### A. **AiAnalysisService** (Backend)
**File**: [backend/src/main/java/com/example/backend/service/AiAnalysisService.java](backend/src/main/java/com/example/backend/service/AiAnalysisService.java)

Used for inference-only; currently **NOT actively integrated** into the main recommendation flow.

**Key Method**:
```java
public Map<String, Object> analyzeAndRecommend(
    ClientKpi kpi,
    List<Reponse> responses,
    List<Offre> availableOffres)
```

**Purpose**: Would analyze customer responses and recommend offers via Gemini API
- Builds prompt with client KPI score, questionnaire responses, and available offers
- Sends to Gemini with system prompt instructing JSON response: `{offreId, reason}`
- Returns analysis map (currently unused)

**Status**: ⚠️ **Implemented but not called** - The main recommendation logic uses rule-based approach instead.

---

### B. **IAQuestionnaireService** (Backend)
**File**: [backend/src/main/java/com/example/backend/service/IAQuestionnaireService.java](backend/src/main/java/com/example/backend/service/IAQuestionnaireService.java)

**ACTIVE** - Core AI service for questionnaire optimization

**Key Methods**:

#### 1. `callGemini(String userMessage)`
- Calls Gemini API with system prompt focused on insurance questionnaire design
- System prompt emphasizes: clear language, single-concept questions, balanced scales, no leading questions
- Returns cleaned JSON (removes markdown)

#### 2. `checkDoublon(String newTitre, String role, List<String> existingTitles)`
- Detects semantic duplicates in survey questions
- **JSON Response**: `{doublon: bool, questionSimilaire: {titre, similarite}, message}`
- Used when creating new questionnaires

#### 3. `reformuler(String titre, String type)`
- **Actively used in frontend** - Auto-suggests question reformulation
- Simplifies/clarifies survey questions for customer clarity
- **JSON Response**: `{titreOriginal, titreReformule, explication}`
- Frontend call: `POST /api/ia/reformuler-question`

#### 4. `reorderQuestions(List<Map> questions)`
- Intelligently reorders survey questions by:
  1. General satisfaction (warm-up questions)
  2. Specific questions grouped by theme
  3. Demographics/sensitive questions
  4. Open-ended questions last
- **JSON Response**: `{orderedIds: [...]}`

---

### C. **KpiCalculatorService** (Backend)
**File**: [backend/src/main/java/com/example/backend/service/KpiCalculatorService.java](backend/src/main/java/com/example/backend/service/KpiCalculatorService.java)

**Rule-based scoring algorithm** - NOT AI but core to recommendation logic

**Scoring Logic**:
```java
public ClientKpi calculateKpi(Long clientId, Long questionnaireId)
```

**Scoring Methods**:
1. **Numeric Scaling** (Likert-scale support):
   - 1-5 scale: `(num - 1) / 4.0 * 100`
   - 1-10 scale: `(num - 1) / 9.0 * 100`

2. **Boolean Answers**:
   - "oui"/"yes" → 100
   - "non"/"no" → 0

3. **Sentiment Phrases**:
   - "très satisfait" → 100
   - "satisfait" → 75
   - "neutre" → 50
   - "insatisfait" → 25
   - "très insatisfait" → 0

4. **Text Analysis** (Sentiment Analysis):
   ```java
   private Set<String> POSITIVE_WORDS = {
       "excellent", "bien", "satisfait", "content", "super",
       "parfait", "merci", "good", "great", "happy",
       "recommend", "love", "best", "amazing", "fantastic"
   };
   
   private Set<String> NEGATIVE_WORDS = {
       "mauvais", "terrible", "insatisfait", "nul", "horrible",
       "probleme", "bad", "worst", "hate", "poor",
       "disappointed", "awful", "never", "complaint"
   };
   ```
   - Counts positive/negative words
   - Score: `(positive_count / total_count) * 100`
   - Default if no keywords: 50 (neutral)

**Output**: `ClientKpi` object with:
- Final score (0-100)
- Sentiment enum (based on score)
- Details JSON (breakdown by question)

---

## 3. Recommendation Engine

### **OffreRecommendationService** (Backend)
**File**: [backend/src/main/java/com/example/backend/service/OffreRecommendationService.java](backend/src/main/java/com/example/backend/service/OffreRecommendationService.java)

**Primary recommendation logic - RULE-BASED, not AI**

**Key Method**:
```java
public OffreRecommendation generateRecommendation(
    Long clientId, Long questionnaireId)
```

**Algorithm**:
1. Calculate client KPI via `KpiCalculatorService.calculateKpi()`
2. Query database for offers matching score range:
   ```java
   offreRepository.findByActiveAndScoreMinLessThanEqualAndScoreMaxGreaterThanEqual(
       true, kpi.getScore().intValue(), kpi.getScore().intValue())
   ```
3. Select first matching offer (or null if no match)
4. Create `OffreRecommendation` record with:
   - `aiRecommendedOffre` (first matching from above)
   - `aiReason` (formatted string explaining why)
   - `status` = PENDING

**Recommendation Status States**:
```java
enum RecommendationStatus {
    PENDING,    // Initial state, awaiting manager review
    ACCEPTED,   // Manager confirmed AI suggestion
    OVERRIDDEN, // Manager manually selected different offer
    SENT        // Email sent to client
}
```

**Email Sending**:
```java
public OffreRecommendation sendRecommendation(Long id)
```
- Sends offer to client via SMTP
- Uses `finalOffre` (if overridden) or `aiRecommendedOffre` (if accepted)
- Email template: Professional offer with title, description
- Updates `status` to SENT, records `sentAt` timestamp

---

## 4. Offer Management

### **Offre Model** (Entity)
**File**: [backend/src/main/java/com/example/backend/models/Offre.java](backend/src/main/java/com/example/backend/models/Offre.java)

**Database Structure**:
```java
@Entity
@Table(name = "offre")
public class Offre {
    Long id;
    String title;           // Offer name (e.g., "Premium Protection")
    String description;     // Marketing description
    String categorie;       // Category (e.g., "AUTO", "HOME", "HEALTH") - default: "general"
    Integer scoreMin;       // Minimum KPI score (default: 0)
    Integer scoreMax;       // Maximum KPI score (default: 100)
    Boolean active;         // Whether offer is currently available (default: true)
}
```

**How Recommendations Match**:
- Offers are **database-driven**, not AI-generated or hardcoded
- Matching based on **score ranges**:
  - Client score 85-100 → Offers with scoreMin ≤ 85 AND scoreMax ≥ 85
  - Client score 40-50 → Offers with scoreMin ≤ 50 AND scoreMax ≥ 50

**Example Offers** (from database):
```
ID | Title | Desc | Category | ScoreMin | ScoreMax | Active
1  | "Premium Protection" | "Advanced coverage..." | "AUTO" | 75 | 100 | true
2  | "Basic Pack" | "Essential coverage..." | "HOME" | 0 | 50 | true
3  | "Family Plus" | "Enhanced family benefits..." | "HEALTH" | 60 | 90 | true
```

---

## 5. Recommendation Controller & API Endpoints

### **RecommendationController** (Backend)
**File**: [backend/src/main/java/com/example/backend/controller/RecommendationController.java](backend/src/main/java/com/example/backend/controller/RecommendationController.java)

**REST API Endpoints**:

```
POST   /api/recommendations/generate/{clientId}/{questionnaireId}
       ↓ Returns newly generated recommendation with AI suggestion

GET    /api/recommendations
       ↓ Returns all recommendations (paginated implicit)

GET    /api/recommendations/pending
       ↓ Returns recommendations with status=PENDING (manager review needed)

PUT    /api/recommendations/{id}/accept
       ↓ Manager accepts AI suggestion - status→ACCEPTED, finalOffre→aiRecommendedOffre

PUT    /api/recommendations/{id}/override/{offreId}
       ↓ Manager selects different offer - status→OVERRIDDEN, finalOffre→selected offer

POST   /api/recommendations/{id}/send
       ↓ Sends recommendation email to client - status→SENT
```

---

## 6. Frontend Services & Models

### **RecommendationService** (Frontend)
**File**: [frontend/src/app/services/offre-recommendation.ts](frontend/src/app/services/offre-recommendation.ts)

```typescript
@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private url = 'http://localhost:8081/api/recommendations';

  generate(clientId: number, questionnaireId: number)
  // POST /generate/{clientId}/{questionnaireId}
  
  getAll()
  // GET / - Load all recommendations
  
  getPending()
  // GET /pending - Load manager review queue
  
  accept(id: number)
  // PUT /{id}/accept - Approve AI suggestion
  
  override(id: number, offreId: number)
  // PUT /{id}/override/{offreId} - Choose different offer
  
  send(id: number)
  // POST /{id}/send - Email client
}
```

### **OffreRecommendation Model** (Frontend)
**File**: [frontend/src/app/models/offre-recommendation.ts](frontend/src/app/models/offre-recommendation.ts)

```typescript
export interface OffreRecommendation {
  id: number;
  clientKpi: ClientKpi;           // Customer satisfaction analysis
  aiRecommendedOffre: Offre | null;  // AI-suggested offer (rule-based)
  aiReason: string;               // Explanation for recommendation
  finalOffre: Offre | null;       // Final offer (after manual override if any)
  status: 'PENDING' | 'ACCEPTED' | 'OVERRIDDEN' | 'SENT';
  sentAt: string | null;
  createdAt: string;
}
```

### **ClientKpi Model** (Frontend)
**File**: [frontend/src/app/models/client-kpi.ts](frontend/src/app/models/client-kpi.ts)

```typescript
export interface ClientKpi {
  id: number;
  client: any;
  questionnaire: any;
  score: number;           // 0-100
  sentiment: string;       // "VERY_SATISFIED" | "SATISFIED" | "NEUTRAL" | "DISSATISFIED" | "VERY_DISSATISFIED"
  details: string;         // JSON breakdown by question
  calculatedAt: string;
}
```

### **Offre Model** (Frontend)
**File**: [frontend/src/app/models/offre.ts](frontend/src/app/models/offre.ts)

```typescript
export interface Offre {
  id: number;
  title: string;
  description: string;
  categorie: string;
  scoreMin: number;
  scoreMax: number;
  active: boolean;
}
```

---

## 7. Dashboard Display

### **DashboardGestionnaire Component** (Frontend)
**File**: [frontend/src/app/dashboard-gestionnaire/dashboard-gestionnaire.ts](frontend/src/app/dashboard-gestionnaire/dashboard-gestionnaire.ts)

**AI-Related Features**:

1. **Load Recommendations** (line ~1099):
   ```typescript
   loadRecommendations() {
       this.http.get('http://localhost:8081/api/recommendations').subscribe({
           next: (data) => {
               this.recommendations = data;
               // Filter by gestionnaire if needed
           }
       });
   }
   ```

2. **Display AI Suggestion in Modal** (line ~905):
   ```typescript
   envoyerOffreClient(client: any) {
       const rec = this.recommendations.find(r => 
           r.clientKpi?.client?.id === client.id
       );
       
       // Display HTML showing:
       // - Client score: 85/100
       // - Sentiment emoji + text (e.g., 😊 Very Satisfied)
       // - AI suggested offer title
       // - AI reasoning
       // - Buttons to Accept or Override with manual choice
   }
   ```

3. **AI Auto-Suggestion for Questions** (line ~1571):
   ```typescript
   autoSuggestQuestion() {
       this.http.post(
           this.apiUrl + '/ia/reformuler-question',
           { titre: this.newquest.titre, type: this.newquest.type }
       ).subscribe(res => {
           if (res?.titreReformule) {
               this.iaAutoSuggestion = res;  // Show suggestion
           }
       });
   }
   
   acceptAutoSuggestion() {
       this.newquest.titre = this.iaAutoSuggestion.titreReformule;
   }
   ```

4. **Bulk Send to All Clients** (line ~969):
   ```typescript
   envoyerOffreTous() {
       // Groups recommendations by offer
       // For each client: uses aiRecommendedOffre or finalOffre
       // Counts clients without recommendations
       // Shows "No AI recommendation available" message if none
   }
   ```

---

## 8. AI Controller & Question Utilities

### **IAController** (Backend)
**File**: [backend/src/main/java/com/example/backend/controller/IAController.java](backend/src/main/java/com/example/backend/controller/IAController.java)

```java
@RestController
@RequestMapping("/api/ia")
public class IAController {
    
    @PostMapping("/check-doublon")
    // Detect semantic duplicate questions
    // Request: { titre, roleQuestionnaire, existingTitles }
    // Response: { doublon, questionSimilaire, message }
    
    @PostMapping("/reformuler-question")
    // Suggest clearer question wording
    // Request: { titre, type }
    // Response: { titreOriginal, titreReformule, explication }
    
    @PostMapping("/valider-choix")
    // Validate answer options are well-formed
    // Request: { titre, type, options }
    // Response: { valide, suggestions, message }
}
```

---

## 9. Summary: How Offers Are Generated

### **RULE-BASED, Not AI-Generated**

| Aspect | Method | Details |
|--------|--------|---------|
| **Offer Creation** | Manual/Database | Admin creates offers with title, description, score ranges |
| **Offer Matching** | Score Range Rule | Matches offers where scoreMin ≤ clientScore ≤ scoreMax |
| **Selection Algorithm** | First Match | Selects first active offer matching score range |
| **AI Enhancement** | Optional Override | Manager can manually select different offer using UI |
| **Client Notification** | Email Template | Sends formatted email with offer details |

### **Recommendation Flow**:
```
Client completes questionnaire
         ↓
KpiCalculatorService calculates score (0-100)
         ↓
OffreRecommendationService finds matching offers by score range
         ↓
First matching offer selected as aiRecommendedOffre
         ↓
Recommendation created with status=PENDING
         ↓
Manager views in dashboard; can Accept or Override
         ↓
If Accepted → status=ACCEPTED, sends email
If Override → status=OVERRIDDEN, finalOffre=manual choice, sends email
```

---

## 10. External Integrations

### **Google Gemini AI**
- **Used For**:
  - Question duplication detection
  - Question reformulation/clarification
  - Question reordering optimization
  - NOT used for offer recommendations (rule-based instead)

### **Email Service**
- **Provider**: Gmail SMTP
- **Config**: rayenmonser@gmail.com (app password: `aavsuvcsdikzhkoe`)
- **Used For**: Sending offer emails to clients

### **WebSocket** (Real-time updates)
- **Spring WebSocket** template for notifying managers of new recommendations
- Configured in `OffreService` to broadcast offer changes

---

## 11. Database Schema (Relevant Entities)

```sql
-- Offers (manually managed)
Table: offre
- id (PK)
- title
- description
- categorie
- scoreMin
- scoreMax
- active

-- Client KPI (auto-calculated)
Table: client_kpi
- id (PK)
- client_id (FK)
- questionnaire_id (FK)
- score (double)
- sentiment (enum)
- details (JSON)
- calculated_at

-- Recommendations (tracked)
Table: offre_recommendation
- id (PK)
- client_kpi_id (FK)
- ai_offre_id (FK) [aiRecommendedOffre]
- ai_reason (text)
- final_offre_id (FK) [finalOffre]
- status (enum: PENDING, ACCEPTED, OVERRIDDEN, SENT)
- sent_at (datetime)
- created_at (datetime)
```

---

## 12. Key Findings

### ✅ What's Implemented
1. **Rule-based offer matching** - Working, active
2. **KPI calculation** - Text & numeric scoring
3. **Gemini AI integration** - Working for questionnaire optimization
4. **Manager recommendation review UI** - In dashboard
5. **Email sending** - Gmail SMTP configured
6. **Real-time WebSocket updates** - For recommendations

### ⚠️ Not Actively Used
1. **AiAnalysisService** - Built but not called by recommendation flow
   - `analyzeAndRecommend()` exists but isn't integrated
   - Could be enabled for AI-based recommendations

### 📊 Current Operation Mode
- **Smart, Not AI-Driven**: Recommendations use intelligent rule-based matching on customer satisfaction scores
- **Manager Control**: Gestionnaire can review and override AI suggestions
- **Hybrid Approach**: AI used for questionnaire optimization, rules for offers

---

## File Location Summary

| Component | File Path |
|-----------|-----------|
| Recommendation Service | backend/src/main/java/com/example/backend/service/OffreRecommendationService.java |
| KPI Calculator | backend/src/main/java/com/example/backend/service/KpiCalculatorService.java |
| AI Questionnaire | backend/src/main/java/com/example/backend/service/IAQuestionnaireService.java |
| AI Analysis (unused) | backend/src/main/java/com/example/backend/service/AiAnalysisService.java |
| Recommendation Controller | backend/src/main/java/com/example/backend/controller/RecommendationController.java |
| IA Controller | backend/src/main/java/com/example/backend/controller/IAController.java |
| Offer Controller | backend/src/main/java/com/example/backend/controller/OffreController.java |
| Recommendation Service (FE) | frontend/src/app/services/offre-recommendation.ts |
| Dashboard Component | frontend/src/app/dashboard-gestionnaire/dashboard-gestionnaire.ts |
| Offre Model (FE) | frontend/src/app/models/offre.ts |
| Recommendation Model (FE) | frontend/src/app/models/offre-recommendation.ts |
| ClientKpi Model (FE) | frontend/src/app/models/client-kpi.ts |

