import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportChatComponent } from './import-chat.component';

describe('ImportChatComponent', () => {
  let component: ImportChatComponent;
  let fixture: ComponentFixture<ImportChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImportChatComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
