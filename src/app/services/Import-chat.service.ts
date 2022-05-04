import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RealTimeResponse } from '../models';
import { environment } from '../../environments/environment';

@Injectable()
export class ImportChatService {
  constructor(private http: HttpClient) {}

  public fetchOrgDetails(
    authKey: string
  ): Promise<RealTimeResponse<any> | any> {
    const url = `${environment.AUTH_SERVER_URL}/orgs?includeUsers=false`;
    const options: any = { headers: {} };
    options.headers['Content-Type'] = 'application/json';
    options.headers['authKey'] = authKey;
    return this.http.get(url, options).toPromise();
  }

  public bulkUserImport(authKey: string, body: any) {
    const url = `${environment.AUTH_SERVER_URL}/bulk-user-import`;
    const options: any = { headers: {} };
    options.headers['Content-Type'] = 'application/json';
    options.headers['authKey'] = authKey;
    return this.http.post(url, body, options).toPromise();
  }

  public bulkTeamImport(authKey: string, body: any) {
    const url = `${environment.CHAT_SERVER_URL}/bulk-team-insert-via-auth-key`;
    const options: any = { headers: {} };
    options.headers['Content-Type'] = 'application/json';
    options.headers['Access-Control-Allow-Origin'] = '*';
    options.headers['authKey'] = authKey;
    options.headers = new HttpHeaders(options.headers);
    return this.http.post(url, body, options).toPromise();
  }

  public bulkMessageImport(authKey: string, body: any) {
    const url = `${environment.CHAT_SERVER_URL}/bulk-insert-messages-via-authkey`;
    const options: any = { headers: {} };
    options.headers['Content-Type'] = 'application/json';
    options.headers['Access-Control-Allow-Origin'] = '*';
    options.headers['authKey'] = authKey;
    options.headers = new HttpHeaders(options.headers);
    return this.http.post(url, body, options).toPromise();
  }

  public getPreSignedUrl(authKey: string, file: any) {
    const url =`${environment.CHAT_SERVER_URL}/fileUpload`;
    const options: any = { headers: {} };
    options.headers['Access-Control-Allow-Origin'] = '*';
    options.headers['authKey'] = authKey;
    const model = { fileNames: [file?.key] };
    return this.http.post(url, model, options).toPromise();
  }

  public uploadFileToS3(preSignedUrl: string, fileObj: any) {
    const fileToUpload: File = fileObj?.content;
    let fileName = fileObj?.content?.name.replace(/[^a-zA-Z0-9.]/g, '');
    const options: any = {
      headers: {
        'Content-Type': fileObj?.file?.type,
        'Content-Disposition': `attachment; filename=${fileName}`,
      },
    };
    return this.http.put(preSignedUrl, fileToUpload, options).toPromise();
  }
}
