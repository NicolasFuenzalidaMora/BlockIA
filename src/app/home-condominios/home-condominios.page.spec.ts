import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeCondominiosPage } from './home-condominios.page';

describe('HomeCondominiosPage', () => {
  let component: HomeCondominiosPage;
  let fixture: ComponentFixture<HomeCondominiosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeCondominiosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
