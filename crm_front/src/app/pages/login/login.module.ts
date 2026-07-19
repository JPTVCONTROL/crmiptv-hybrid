import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { GuestGuard } from '../../core/guards/auth.guard';
import { LoginPage } from './login.page';

const routes: Routes = [
  {
    path: '',
    component: LoginPage,
    canActivate: [GuestGuard],
  },
];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [LoginPage],
})
export class LoginPageModule {}
