package com.example.backend.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

<<<<<<< HEAD
@Repository
public interface GestionnaireRepository extends JpaRepository<Gestionnaire, Long> {
    Gestionnaire findByEmail(String email);
=======
import com.example.backend.models.Gestionnaire;


@Repository
public interface GestionnaireRepository extends JpaRepository<Gestionnaire, Long> {
    Gestionnaire findByEmailAndPassword(String email, String password);

>>>>>>> 93cfe3b8d5b899c9183aa8b5d20abae756475c56
}
