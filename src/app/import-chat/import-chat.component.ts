import { Component, NgZone, OnInit } from '@angular/core';
import * as JSZip from 'jszip';
import * as csv from 'csvtojson';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ImportChatService } from '../services/Import-chat.service';
import { v4 as uuidv4 } from 'uuid';
import { environment } from '../../environments/environment';
@Component({
  selector: 'app-import-chat',
  templateUrl: './import-chat.component.html',
  styleUrls: ['./import-chat.component.scss'],
})
export class ImportChatComponent implements OnInit {
  showFileUploadLoader: any;
  progressBarMsg: any;
  attachments: any = [];
  fileUploadings: any;
  orgs: any;
  orgId: string | any;
  fileUploadBarWidthPercent: string = '0';
  messageImportWidthPercent: string = '0';
  processingFileWidthPercent: string = '0';
  userData: any;
  conversationData: any;
  messageData: any;
  totalNumberOfMessages = 0;
  importedMessages = 0;
  progressBarValue = 0;
  teamDetails: any = {};
  public isFileProcessing: boolean = false;
  public presignedURLs: any = {};
  public isLoading: boolean = false;
  public importChatForm: FormGroup;
  public orgDetailAuthKeyForm: FormGroup;
  public orgDetails: any;
  public showErrorMessage: string = '';
  authKey: string = '';
  public uploadCompletedMessage = '';
  public signatureForImageAccess = '';
  constructor(
    private formBuilder: FormBuilder,
    private importChatService: ImportChatService
  ) {
    this.importChatForm = this.formBuilder.group({
      chatFile: [''],
    });
    this.orgDetailAuthKeyForm = this.formBuilder.group({
      authKey: '',
    });
  }

  ngOnInit(): void {
    this.importChatForm = this.formBuilder.group({
      chatFile: [''],
    });
  }

  onFileSelect(event: any) {
    const files: File[] = event.srcElement.files || event;
    if (files.length) {
      this.fileFormat(files[0]);
      this.importChatForm.get('chatFile')?.setValue(files[0]);
    }
  }

  onSubmit() {
    const uploadedFile = this.importChatForm.get('chatFile')?.value;
    this.fileFormat(uploadedFile);
  }

  public onFileUploading(ev: any) {
    this.showFileUploadLoader = ev.inProgress;
    this.progressBarMsg = ev.msg;
  }

  public onfileInputChange(event: any) {
    const files: File[] = event.srcElement.files || event;
  }

  public async fileFormat(zipFile: any) {
    this.isFileProcessing = true;
    let userData: any = [];
    let conversationData: any = [];
    const messageData: any = {};
    const zip = new JSZip();
    const zipFileData: any = await zip.loadAsync(zipFile);

    const fileKeys: any = Object.keys(zipFileData.files) || [];
    const fileBufferData = (
      await Promise.all(
        fileKeys.map(async (file: any) => {
          const data = await zip?.file(file)?.async('text');

          return {
            fileName: file.slice(
              file.lastIndexOf('/') + 1,
              file.indexOf('.csv')
            ),
            isCsv: file.endsWith('.csv'),
            data,
          };
        })
      )
    ).filter((data: any) => data?.data !== undefined);
    let indexValue = 0;
    await Promise.all(
      fileBufferData.map(async (file: any) => {
        if (file.isCsv) {
          if (file.fileName.includes('user')) {
            const jsonUserData: any = await csv().fromString(file.data);
            if (jsonUserData?.length > 0 && jsonUserData[0]?.email) {
              userData = jsonUserData.map((user: any) => ({
                username: user?.email?.slice(0, user?.email?.indexOf('@')),
                email: user?.email,
                firstName: user?.name?.slice(0, user?.name?.indexOf(' ')) || '',
                lastName: user?.name?.slice(user?.name?.indexOf(' ')) || '',
                createdAt: user?.createdTime,
                role: user?.role === 'owner' ? 0 : 2,
                displayName:
                  (user?.name?.slice(0, user?.name?.indexOf(' ')) || '') +
                  ' ' +
                  (user?.name?.slice(user?.name?.indexOf(' ')) || ''),
              }));
            }
            this.processingFileWidthPercent = `${Math.floor(
              ((indexValue + 1) * 100) / fileBufferData.length
            )}`;
            indexValue = indexValue + 1;
          } else if (file.fileName.includes('conversation')) {
            const jsonConversationData: any = await csv().fromString(file.data);
            if (
              jsonConversationData?.length > 0 &&
              jsonConversationData[0]?.id &&
              jsonConversationData[0]?.type
            ) {
              conversationData = jsonConversationData.map((item: any) => {
                const teamIdentifier = item.id.split('@')[0];
                this.teamDetails[teamIdentifier] =
                  item.name + '_' + teamIdentifier;
                return {
                  id: item.id,
                  name: item.name,
                  type: item.type,
                  visibility: item.visibility,
                  createdBy: item.createdBy,
                  createdTime: item.createdTime,
                };
              });
            }
            this.processingFileWidthPercent = `${Math.floor(
              ((indexValue + 1) * 100) / fileBufferData.length
            )}`;
            indexValue = indexValue + 1;
          } else {
            const data = await csv().fromString(file.data);
            if (
              data?.length &&
              data?.length > 0 &&
              data[0]?.id &&
              data[0]?.createdBy
            ) {
              let localMessageArray = [];
              for (let message of data) {
                const newMessageData: any = {
                  text: message?.text || '',
                  createdBy: message?.createdBy.split('@')[0] || '',
                  id: message?.id,
                  createdAt: message.createdTime,
                };
                if (
                  message?.text.length === 0 &&
                  (message?.field5?.includes('jpg') ||
                    message?.field5?.includes('image') ||
                    message?.field5?.includes('png'))
                ) {
                  newMessageData.text = '';
                  if (message?.field5) {
                    newMessageData.text = 'Shared attachment from desktop.';
                    const fileData = message?.field5.split('|');
                    const fileName = fileData[2];
                    const fileLink = `${fileData[3]}?${this.signatureForImageAccess}`;
                    if (fileLink && fileName) {
                      const fileAttachmentObject = await this.uploadFile(
                        fileLink,
                        fileName
                      );
                      await this.importChatService
                        .uploadFileToS3(
                          fileAttachmentObject?.uploadInfo.presignedURL,
                          fileAttachmentObject?.uploadInfo.file
                        )
                        .catch((err: any) => {});
                      newMessageData.attachment = [
                        fileAttachmentObject?.attachment,
                      ];
                    }
                  }
                }
                localMessageArray.push(newMessageData);
              }
              messageData[file.fileName] = [...localMessageArray];
              this.totalNumberOfMessages += messageData[file.fileName].length;
              this.processingFileWidthPercent = `${Math.floor(
                ((indexValue + 1) * 100) / fileBufferData.length
              )}`;
              indexValue = indexValue + 1;
            }
          }
        } else if (file.fileName.includes('storage-query-vars')) {
          this.signatureForImageAccess = file.data;
          this.processingFileWidthPercent = `${Math.floor(
            ((indexValue + 1) * 100) / fileBufferData.length
          )}`;
          indexValue = indexValue + 1;
        }
      })
    );
    this.messageData = messageData;
    this.conversationData = conversationData;
    this.userData = userData;
    this.isFileProcessing = false;
  }

  public async uploadFile(fileLink: string, fileName: string) {
    let response = await fetch(fileLink);
    const data = await response.blob();
    let metadata = {
      type: data.type,
    };
    let file: any = new File([data], fileName, metadata);
    const name = file.name.replace(/[^\w\s\.\_\-\ñáéíóúü¿¡]/gi, '');
    const fileToUpload = {
      key: `${uuidv4()}/${fileName}`,
      name,
      comment: '',
      path: file.path,
      // handle for zip and dmg and few other types
      type: file.type || `application/${name.split('.').pop()}`,
      isShared: true,
      file,
    };
    const responseFromPreSignedUrl: any = await this.importChatService
      .getPreSignedUrl(this.authKey, {
        content: fileToUpload.file,
        key: `${fileToUpload.key}`,
        file: {
          type: fileToUpload.type,
        },
      })
      .catch((err: any) => {});

    if (responseFromPreSignedUrl[fileToUpload.key]) {
      this.presignedURLs[fileToUpload.key] = {
        presignedUrl: responseFromPreSignedUrl[fileToUpload?.key],
        file: {
          content: fileToUpload.file,
          key: `${fileToUpload.key}`,
          file: {
            type: fileToUpload.type,
          },
        },
      };
      const attachment = {
        title: fileToUpload.name,
        key: `${fileToUpload.key}`,
        resourceUrl: `${environment.CLOUD_BASE_URL}/${encodeURI(
          fileToUpload.key
        )}`,
        contentType: fileToUpload.file.type,
        size: fileToUpload.file.size,
        encoding: '',
      };
      return {
        uploadInfo: {
          presignedURL: responseFromPreSignedUrl[fileToUpload?.key],
          file: {
            content: fileToUpload.file,
            key: `${fileToUpload.key}`,
            file: {
              type: fileToUpload.type,
            },
          },
        },
        attachment,
      };
    }
    return undefined;
  }

  public formatTextFileToJson(fileData: string): any[] {
    let lines = fileData.split('\n');
    lines = lines.slice(0, lines.length - 1);

    const keys = this.formatTextLine(lines[0]);

    const data: any[] = [];
    for (let index = 1; index < lines.length; index++) {
      const line = this.formatTextLine(lines[index]);
      const lineJsonObject: any = {};
      for (
        let lineObjectIndex = 0;
        lineObjectIndex < keys.length;
        lineObjectIndex++
      ) {
        const key = keys[lineObjectIndex];
        lineJsonObject[key] = line[lineObjectIndex];
      }
      data.push(lineJsonObject);
    }
    return data;
  }

  public formatTextLine(line: string): string[] {
    return line.split('","').map((str) => str.replace('"', ''));
  }

  public removeFile(index: any) {
    this.attachments.splice(index, 1);
  }
  async startImport() {
    if (this?.importChatForm?.get('chatFile')?.value !== '') {
      this.uploadCompletedMessage = '';
      this.isLoading = true;
      await this.importUsers();
      await this.importTeams();
      await this.importMessages();
      this.uploadCompletedMessage = 'Uploaded successfully';
      this.isLoading = false;
    }
  }
  async importUsers() {
    for (let index = 0; index < this.userData.length; index = index + 10) {
      const currentUserData = this.userData.slice(index, index + 10);
      await this.callImportChatApi(currentUserData, 'importUsers');
    }
  }

  async importTeams() {
    for (
      let index = 0;
      index < this.conversationData.length;
      index = index + 10
    ) {
      const currentTeamsArray = this.conversationData.slice(index, index + 10);
      await this.callImportChatApi(currentTeamsArray, 'importTeams');
    }
  }

  async importMessages() {
    let indexValue = 0;
    let totalLength = 0;
    for (const teamIdentifier of Object.keys(this.messageData)) {
      totalLength = totalLength + this.messageData[teamIdentifier].length;
    }
    for (const teamIdentifier of Object.keys(this.messageData)) {
      const teamMessages: any[] = this.messageData[teamIdentifier];
      for (let index = 0; index < teamMessages.length; index = index + 50) {
        const currentMessageArray = teamMessages.slice(index, index + 50);

        const importData = {
          messageData: currentMessageArray,
          teamName: this.teamDetails[teamIdentifier],
        };

        await this.callImportChatApi(importData, 'importMessages');
        this.importedMessages += currentMessageArray.length;
        this.progressBarValue = Math.floor(
          (this.importedMessages / this.totalNumberOfMessages) * 100
        );
        this.messageImportWidthPercent = `${Math.floor(
          ((indexValue + 1) * 100) / totalLength
        )}`;
        indexValue += currentMessageArray.length;
      }
    }
  }

  public async callImportChatApi(data: any, type: string) {
    if (type === 'importUsers') {
      await this.importChatService
        .bulkUserImport(this.authKey, {
          userData: data,
        })
        .catch((err: any) => {});
    }
    if (type === 'importTeams') {
      await this.importChatService
        .bulkTeamImport(this.authKey, {
          importData: data,
        })
        .catch((err: any) => {});
    }

    if (type === 'importMessages') {
      await this.importChatService
        .bulkMessageImport(this.authKey, data)
        .catch((err: any) => {});
    }
  }

  public async getOrgDetails() {
    const authKey = this.orgDetailAuthKeyForm.get('authKey')?.value;
    if (authKey) {
      const response = await this.importChatService
        .fetchOrgDetails(authKey)
        .catch((err: any) => {
          this.orgDetails = undefined;
          this.showErrorMessage = 'Invalid Auth Key';
          this.uploadCompletedMessage = '';
        });
      if (response?.length > 0) {
        this.orgDetails = response[0];
        this.authKey = authKey;
        this.showErrorMessage = '';
        this.uploadCompletedMessage = '';
      }
    }
  }
}
