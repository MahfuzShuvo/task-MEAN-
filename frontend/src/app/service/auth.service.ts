import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { WebRequestService } from './web-request.service';
import { shareReplay, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private http: HttpClient, private webService: WebRequestService, private router: Router) { }

  login(email: string, password: string) {
    return this.webService.login(email, password).pipe(
      shareReplay(),
      tap((res: HttpResponse<any>) => {
        // auth tokens will be in the header of this response 
        this.setSession(res.body._id, res.headers.get('x-access-token'), res.headers.get('x-refresh-token'));
        console.log('logged in');
      })
    )
  }

  register(name: string, contact: string, email: string, password: string) {
    return this.webService.register(name, contact, email, password).pipe(
      shareReplay(),
      tap((res: HttpResponse<any>) => {
        // auth tokens will be in the header of this response 
        this.setSession(res.body._id, res.headers.get('x-access-token'), res.headers.get('x-refresh-token'));
        console.log('Registerd');
      })
    )
  }

  logout() {
    this.removeSession();
    this.router.navigate(['/login']);
  }

  getAccessToken(): string {
    return localStorage.getItem('x-access-token') || '';
  }

  getRefreshToken(): string {
    return localStorage.getItem('x-refresh-token') || '';
  }

  getUserId(): string {
    return localStorage.getItem('user-id') || '';
  }

  setAccessToken(accessToken: any) {
    return localStorage.setItem('x-access-token', accessToken);
  }

  private setSession(userId: string, accessToken: any, refreshToken: any) {
    localStorage.setItem('user-id', userId);
    localStorage.setItem('x-access-token', accessToken);
    localStorage.setItem('x-refresh-token', refreshToken);
  }

  private removeSession() {
    localStorage.removeItem('user-id');
    localStorage.removeItem('x-access-token');
    localStorage.removeItem('x-refresh-token');
  }

  getNewAccessToken() {
    return this.http.get(`${this.webService.ROOT_URL}/users/me/access-token`, {
      headers: {
        'x-refresh-token': this.getRefreshToken(),
        '_id': this.getUserId()
      },
      observe: 'response'
    }).pipe(
      tap((res: HttpResponse<any>) => {
        this.setAccessToken(res.headers.get('x-access-token'));
      })
    )
  }
}
