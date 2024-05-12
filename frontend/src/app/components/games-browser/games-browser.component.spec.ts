import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GamesBrowserComponent } from './games-browser.component';

describe('GamesBrowserComponent', () => {
  let component: GamesBrowserComponent;
  let fixture: ComponentFixture<GamesBrowserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GamesBrowserComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GamesBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
