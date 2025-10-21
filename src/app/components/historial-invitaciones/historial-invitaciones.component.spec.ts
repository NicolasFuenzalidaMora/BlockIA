import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { HistorialInvitacionesComponent } from './historial-invitaciones.component';

describe('HistorialInvitacionesComponent', () => {
  let component: HistorialInvitacionesComponent;
  let fixture: ComponentFixture<HistorialInvitacionesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HistorialInvitacionesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HistorialInvitacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
