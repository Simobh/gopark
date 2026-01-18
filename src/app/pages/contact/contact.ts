import { Component } from '@angular/core';
import { FormBuilder,ReactiveFormsModule,Validators } from '@angular/forms';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact { contactForm: any;   

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore
  ) {
    
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      message: ['', Validators.required],
      consent: [false, Validators.requiredTrue],
    });
  }

  async submit() {
  console.log('SUBMIT CALLED');

  
  if (this.contactForm.invalid) {

    const errors: string[] = [];

    if (this.contactForm.get('name')?.invalid) {
      errors.push('Le nom est obligatoire.');
    }

    if (this.contactForm.get('email')?.invalid) {
      errors.push('Une adresse e-mail valide est obligatoire.');
    }

    if (this.contactForm.get('message')?.invalid) {
      errors.push('Le message ne peut pas être vide.');
    }

    if (this.contactForm.get('consent')?.invalid) {
      errors.push('Vous devez autoriser la conservation de vos données.');
    }

    Swal.fire({
      icon: 'warning',
      title: 'Formulaire incomplet',
      html: `
        <div style="text-align:left">
          <p>Merci de corriger les points suivants :</p>
          <ul>
            ${errors.map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>
      `,
      timer: 4000,
      timerProgressBar: true,
      showConfirmButton: false
    });

    return;
  }

  
  try {
    await addDoc(collection(this.firestore, 'contactMessages'), {
      name: this.contactForm.value.name,
      email: this.contactForm.value.email,
      phone: this.contactForm.value.phone,
      message: this.contactForm.value.message,
      createdAt: new Date(),
      read: false,
    });

    Swal.fire({
      icon: 'success',
      title: 'Message envoyé',
      text: 'Votre message a été envoyé avec succès. Nous vous répondrons rapidement.',
      timer: 4000,
      timerProgressBar: true,
      showConfirmButton: false
    });

    this.contactForm.reset();

  } catch (err) {
    console.error(err);

    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: 'Une erreur est survenue lors de l’envoi du message. Veuillez réessayer.',
      timer: 4000,
      timerProgressBar: true,
      showConfirmButton: false
    });
  }
}

}