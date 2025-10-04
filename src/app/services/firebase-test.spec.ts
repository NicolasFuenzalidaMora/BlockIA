import { TestBed } from '@angular/core/testing';

import { FirebaseTest } from './firebase-test.service';

describe('FirebaseTest', () => {
  let service: FirebaseTest;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseTest);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
