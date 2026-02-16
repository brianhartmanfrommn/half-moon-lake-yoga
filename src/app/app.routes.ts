import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SignupComponent } from './signup/signup.component';
import { AdminComponent } from './admin/admin.component';
import { LoginComponent } from './admin/login/login.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'signup/:classId', component: SignupComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'admin/login', component: LoginComponent },
  { path: '**', redirectTo: '' }
];