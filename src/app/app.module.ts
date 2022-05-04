import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { ImportChatComponent } from './import-chat/import-chat.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ImportChatService } from './services/Import-chat.service';

@NgModule({
  declarations: [AppComponent, ImportChatComponent],
  imports: [BrowserModule, HttpClientModule, FormsModule, ReactiveFormsModule],
  providers: [ImportChatService],
  bootstrap: [AppComponent],
})
export class AppModule {}
