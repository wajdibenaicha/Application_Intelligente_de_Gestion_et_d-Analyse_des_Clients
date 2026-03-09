import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';  // ← IMPORTANT pour ngModel

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],  // ← AJOUTE FormsModule ici
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  // Propriétés (variables)
  full_name: string = '';
  password: string = '';
  isRobot: boolean = false;

  // Méthodes (fonctions)
  verifRobot() {
    this.isRobot = !this.isRobot;
    console.log('Robot vérifié:', this.isRobot);
  }

  verifUser() {
    if (this.full_name && this.password && this.isRobot) {
      console.log('Connexion réussie pour:', this.full_name);
      // Ajoute ici ta logique de connexion
      // this.router.navigate(['/accueil']);
    } else {
      console.log('Veuillez remplir tous les champs et vérifier que vous n\'êtes pas un robot');
      alert('Veuillez remplir tous les champs et cocher "Je ne suis pas un robot"');
    }
  }
}