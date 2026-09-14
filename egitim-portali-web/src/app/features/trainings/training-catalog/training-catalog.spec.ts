import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingCatalog } from './training-catalog';

describe('TrainingCatalog', () => {
  let component: TrainingCatalog;
  let fixture: ComponentFixture<TrainingCatalog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingCatalog],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingCatalog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
