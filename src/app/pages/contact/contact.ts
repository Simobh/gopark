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
    if (this.contactForm.invalid) return;

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
      confirmButtonText: 'OK',
      confirmButtonColor: '#0f3d2e'
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
      confirmButtonText: 'Fermer',
      confirmButtonColor: '#dc3545'
    });

    }
  }
}