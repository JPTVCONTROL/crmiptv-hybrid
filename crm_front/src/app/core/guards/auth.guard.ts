import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    if (this.auth.estaAutenticado()) {
      return true;
    }

    return this.router.createUrlTree(['/login'], {
      queryParams: state.url !== '/login' ? { returnUrl: state.url } : undefined,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean | UrlTree {
    if (!this.auth.estaAutenticado()) {
      return true;
    }

    return this.router.createUrlTree(['/dashboard']);
  }
}
