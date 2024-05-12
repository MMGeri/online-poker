import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpsertGameComponent } from './upsert-game.component';

describe('UpsertGameComponent', () => {
  let component: UpsertGameComponent;
  let fixture: ComponentFixture<UpsertGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpsertGameComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpsertGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
