import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PerfilCompletoGuard } from './perfil-completo.guard';
import { AuthService } from '../services/auth.service';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';

describe('PerfilCompletoGuard', () => {
  let guard: PerfilCompletoGuard;
  let mockAuthService: any;
  let mockFirestoreService: any;
  let mockRouter: any;

  beforeEach(() => {
    // 🔧 Mocks básicos para simular los servicios
    mockAuthService = {
      currentUser: { uid: '123' },
    };

    mockFirestoreService = {
      getUserById: jasmine.createSpy('getUserById').and.returnValue(Promise.resolve({ perfilCompleto: true }))
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    TestBed.configureTestingModule({
      providers: [
        PerfilCompletoGuard,
        { provide: AuthService, useValue: mockAuthService },
        { provide: BlockiaFirestoreService, useValue: mockFirestoreService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    guard = TestBed.inject(PerfilCompletoGuard);
  });

  it('debería crearse correctamente', () => {
    expect(guard).toBeTruthy();
  });

  it('debería permitir acceso si el perfil está completo', async () => {
    const result = await guard.canActivate();
    expect(result).toBeTrue();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('debería redirigir a completar-perfil si el perfil no está completo', async () => {
    mockFirestoreService.getUserById.and.returnValue(Promise.resolve({ perfilCompleto: false }));
    const result = await guard.canActivate();
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/completar-perfil']);
  });

  it('debería redirigir a login si no hay usuario logueado', async () => {
    mockAuthService.currentUser = null;
    const result = await guard.canActivate();
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login-phone']);
  });
});
