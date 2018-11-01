import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {HashUtil} from './hash-util';
import {EventEmitter} from '@angular/core';

const sessionStorageParamName = 'savedRequests';

/**The duration that no resubmitting is allowed, for example: if set to 5 seconds, user can not submit the
 * same form again in 5 seconds. The config unit is in seconds.*/
const postDataDurationMin = 3;

export class PreventDoubleSubmissionInterceptor implements HttpInterceptor {

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (req.method === 'POST') {
            let serializeBody = req.serializeBody();
            let bodyParams: string = '';
            if (serializeBody != null) {
                bodyParams = serializeBody.toString();
            }
            const ee = new EventEmitter<HttpEvent<any>>();

            HashUtil.getSha256(bodyParams).then((hashedBodyParams) => {
                    const currentData = {
                        hash: hashedBodyParams,
                        date: Date.now()
                    };

                    let item = sessionStorage.getItem(sessionStorageParamName);
                    if (!item) {
                        item = '';
                    }
                    let savedRequests = JSON.parse(item);
                    if (savedRequests) {
                        const now = Date.now();
                        for (const obj of savedRequests) {
                            if ((obj.hash === hashedBodyParams) && (now - obj.date < postDataDurationMin * 1000)) {
                                ee.error(new Error('DUPLICATE_REQUEST'));
                                return;
                            }
                        }
                    } else {
                        savedRequests = [];
                    }
                    savedRequests.push(currentData);
                    sessionStorage.setItem(sessionStorageParamName, JSON.stringify(savedRequests));
                    next.handle(req).subscribe(ee);
                }
            );
            return ee;
        } else {
            return next.handle(req);
        }
    }
}
