import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginPhonePage } from './login-phone.page';

describe('LoginPhonePage', () => {
  let component: LoginPhonePage;
  let fixture: ComponentFixture<LoginPhonePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginPhonePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
