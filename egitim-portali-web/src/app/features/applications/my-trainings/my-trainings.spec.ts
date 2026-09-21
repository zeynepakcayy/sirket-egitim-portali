import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyTrainings } from './my-trainings';

describe('MyTrainings', () => {
  let component: MyTrainings;
  let fixture: ComponentFixture<MyTrainings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyTrainings],
    }).compileComponents();

    fixture = TestBed.createComponent(MyTrainings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
