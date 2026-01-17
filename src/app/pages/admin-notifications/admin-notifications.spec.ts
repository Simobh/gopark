import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminNotifications } from './admin-notifications';

describe('AdminNotifications', () => {
  let component: AdminNotifications;
  let fixture: ComponentFixture<AdminNotifications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminNotifications]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminNotifications);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
