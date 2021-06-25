import { HttpResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';

@Component({
  selector: 'app-register-page',
  templateUrl: './register-page.component.html',
  styleUrls: ['./register-page.component.scss']
})
export class RegisterPageComponent implements OnInit {

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
  }

  onRegisterClick(name: string, contact: string, email: string, password: string) {
    this.authService.register(name, contact, email, password).subscribe((res: HttpResponse<any>) => {
      if (res.status === 200) {
        // logged in 
        this.router.navigate(['/lists']);
      }
      console.log(res);
    });
  }

}
