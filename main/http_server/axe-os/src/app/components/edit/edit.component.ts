import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { startWith, Subject, takeUntil } from 'rxjs';
import { LoadingService } from 'src/app/services/loading.service';
import { SystemService } from 'src/app/services/system.service';
import { eASICModel } from 'src/models/enum/eASICModel';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss']
})
export class EditComponent implements OnInit, OnDestroy {

  public form!: FormGroup;

  public firmwareUpdateProgress: number | null = null;
  public websiteUpdateProgress: number | null = null;

  public savedChanges: boolean = false;
  public devToolsOpen: boolean = false;
  public eASICModel = eASICModel;
  public ASICModel!: eASICModel;

  @Input() uri = '';

  public nonceRangeOptions = [
    { name: 'S19k Pro Default (0x115A)', value: 0x115A },
    { name: 'S19XP-Luxos Default (0x1446)', value: 0x1446 },
    { name: 'S19XP-Stock Default (0x151C)', value: 0x151C },
    { name: 'Minimum (0x1000)', value: 0x1000 },
    { name: 'Mid-Range (0x4000)', value: 0x4000 },
    { name: 'Half Maximum (0x8000)', value: 0x8000 },
    { name: 'Maximum (0xFFFF)', value: 0xFFFF }
  ];

  public BM1397DropdownFrequency = [
    { name: '400', value: 400 },
    { name: '425 (default)', value: 425 },
    { name: '450', value: 450 },
    { name: '475', value: 475 },
    { name: '485', value: 485 },
    { name: '500', value: 500 },
    { name: '525', value: 525 },
    { name: '550', value: 550 },
    { name: '575', value: 575 },
    { name: '590', value: 590 },
    { name: '600', value: 600 },
    { name: '610', value: 610 },
    { name: '620', value: 620 },
    { name: '630', value: 630 },
    { name: '640', value: 640 },
    { name: '650', value: 650 },
  ];

  public BM1366DropdownFrequency = [
    { name: '400', value: 400 },
    { name: '425', value: 425 },
    { name: '450', value: 450 },
    { name: '475', value: 475 },
    { name: '485 (default)', value: 485 },
    { name: '500', value: 500 },
    { name: '525', value: 525 },
    { name: '550', value: 550 },
    { name: '575', value: 575 },
  ];

  public BM1368DropdownFrequency = [
    { name: '400', value: 400 },
    { name: '425', value: 425 },
    { name: '450', value: 450 },
    { name: '475', value: 475 },
    { name: '490 (default)', value: 490 },
    { name: '500', value: 500 },
    { name: '525', value: 525 },
    { name: '550', value: 550 },
    { name: '575', value: 575 },
  ];

  public BM1370DropdownFrequency = [
    { name: '400', value: 400 },
    { name: '490', value: 490 },
    { name: '525 (default)', value: 525 },
    { name: '550', value: 550 },
    { name: '575', value: 575 },
    { name: '600', value: 600 },
    { name: '625', value: 625 },
  ];

  public BM1370CoreVoltage = [
    { name: '1000', value: 1000 },
    { name: '1060', value: 1060 },
    { name: '1100', value: 1100 },
    { name: '1150 (default)', value: 1150 },
    { name: '1200', value: 1200 },
    { name: '1250', value: 1250 },
  ];

  public BM1397CoreVoltage = [
    { name: '1100', value: 1100 },
    { name: '1150', value: 1150 },
    { name: '1200', value: 1200 },
    { name: '1250', value: 1250 },
    { name: '1300', value: 1300 },
    { name: '1350', value: 1350 },
    { name: '1400', value: 1400 },
    { name: '1450', value: 1450 },
    { name: '1500', value: 1500 },
  ];

  public BM1366CoreVoltage = [
    { name: '1100', value: 1100 },
    { name: '1150', value: 1150 },
    { name: '1200 (default)', value: 1200 },
    { name: '1250', value: 1250 },
    { name: '1300', value: 1300 },
  ];

  public BM1368CoreVoltage = [
    { name: '1100', value: 1100 },
    { name: '1150', value: 1150 },
    { name: '1166 (default)', value: 1166 },
    { name: '1200', value: 1200 },
    { name: '1250', value: 1250 },
    { name: '1300', value: 1300 },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private systemService: SystemService,
    private toastr: ToastrService,
    private loadingService: LoadingService
  ) {
    window.addEventListener('resize', this.checkDevTools.bind(this));
    this.checkDevTools();
  }

  ngOnInit(): void {
    this.systemService.getInfo(this.uri)
      .pipe(
        this.loadingService.lockUIUntilComplete(),
        takeUntil(this.destroy$)
      )
      .subscribe(info => {
        this.ASICModel = info.ASICModel;
        this.form = this.fb.group({
          flipscreen: [info.flipscreen == 1],
          invertscreen: [info.invertscreen == 1],
          stratumURL: [info.stratumURL, [
            Validators.required,
            Validators.pattern(/^(?!.*stratum\+tcp:\/\/).*$/),
            Validators.pattern(/^[^:]*$/),
          ]],
          stratumPort: [info.stratumPort, [
            Validators.required,
            Validators.pattern(/^[^:]*$/),
            Validators.min(0),
            Validators.max(65353)
          ]],
          fallbackStratumURL: [info.fallbackStratumURL, [
            Validators.pattern(/^(?!.*stratum\+tcp:\/\/).*$/),
          ]],
          fallbackStratumPort: [info.fallbackStratumPort, [
            Validators.required,
            Validators.pattern(/^[^:]*$/),
            Validators.min(0),
            Validators.max(65353)
          ]],
          stratumUser: [info.stratumUser, [Validators.required]],
          stratumPassword: ['*****', [Validators.required]],
          fallbackStratumUser: [info.fallbackStratumUser, [Validators.required]],
          fallbackStratumPassword: ['password', [Validators.required]],
          coreVoltage: [info.coreVoltage, [Validators.required]],
          frequency: [info.frequency, [Validators.required]],
          autofanspeed: [info.autofanspeed == 1, [Validators.required]],
          invertfanpolarity: [info.invertfanpolarity == 1, [Validators.required]],
          fanspeed: [info.fanspeed, [Validators.required]],
          overheat_mode: [info.overheat_mode, [Validators.required]],
          nonceRange: [info.nonceRange || 0x151C, [Validators.required]]
        });

        this.form.controls['autofanspeed'].valueChanges.pipe(
          startWith(this.form.controls['autofanspeed'].value),
          takeUntil(this.destroy$)
        ).subscribe(autofanspeed => {
          if (autofanspeed) {
            this.form.controls['fanspeed'].disable();
          } else {
            this.form.controls['fanspeed'].enable();
          }
        });

        console.log('Initial form value:', this.form.value);
        console.log('Initial form valid:', this.form.valid);
        console.log('Initial nonceRange:', this.form.get('nonceRange')?.value);

        this.form.valueChanges.subscribe(value => {
          console.log('Form changed to:', value);
          console.log('Form valid:', this.form.valid);
          console.log('Form dirty:', this.form.dirty);
          console.log('nonceRange value:', value.nonceRange);
          if (this.form.invalid) {
            console.log('Form errors:', this.form.errors);
            console.log('nonceRange errors:', this.form.get('nonceRange')?.errors);
          }
        });
      });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.checkDevTools.bind(this));
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkDevTools(): void {
    if (
      window.outerWidth - window.innerWidth > 160 ||
      window.outerHeight - window.innerHeight > 160
    ) {
      this.devToolsOpen = true;
    } else {
      this.devToolsOpen = false;
    }
  }

  public updateSystem() {
    const form = this.form.getRawValue();

    if (form.stratumPassword === '*****') {
      delete form.stratumPassword;
    }
    if (form.fallbackStratumPassword === 'password') {
      delete form.fallbackStratumPassword;
    }

    console.log('Submitting form:', form);

    this.systemService.updateSystem(this.uri, form)
      .pipe(this.loadingService.lockUIUntilComplete())
      .subscribe({
        next: () => {
          this.toastr.success('Success!', 'Saved.');
          this.savedChanges = true;
        },
        error: (err: HttpErrorResponse) => {
          this.toastr.error('Error.', `Could not save. ${err.message}`);
          this.savedChanges = false;
          console.error('Save error:', err);
        }
      });
  }

  showStratumPassword: boolean = false;
  toggleStratumPasswordVisibility() {
    this.showStratumPassword = !this.showStratumPassword;
  }

  showWifiPassword: boolean = false;
  toggleWifiPasswordVisibility() {
    this.showWifiPassword = !this.showWifiPassword;
  }

  disableOverheatMode() {
    this.form.patchValue({ overheat_mode: 0 });
    this.updateSystem();
  }

  showFallbackStratumPassword: boolean = false;
  toggleFallbackStratumPasswordVisibility() {
    this.showFallbackStratumPassword = !this.showFallbackStratumPassword;
  }

  public restart() {
    this.systemService.restart(this.uri)
      .pipe(this.loadingService.lockUIUntilComplete())
      .subscribe({
        next: () => {
          this.toastr.success('Success!', 'Bitaxe restarted');
        },
        error: (err: HttpErrorResponse) => {
          this.toastr.error('Error', `Could not restart. ${err.message}`);
        }
      });
  }

  getDropdownFrequency() {
    let options = [];
    switch(this.ASICModel) {
        case this.eASICModel.BM1366: options = [...this.BM1366DropdownFrequency]; break;
        case this.eASICModel.BM1368: options = [...this.BM1368DropdownFrequency]; break;
        case this.eASICModel.BM1370: options = [...this.BM1370DropdownFrequency]; break;
        case this.eASICModel.BM1397: options = [...this.BM1397DropdownFrequency]; break;
        default: return [];
    }

    const currentFreq = this.form?.get('frequency')?.value;
    if (currentFreq && !options.some(opt => opt.value === currentFreq)) {
        options.push({
            name: `${currentFreq} (Custom)`,
            value: currentFreq
        });
        options.sort((a, b) => a.value - b.value);
    }

    return options;
  }

  getCoreVoltage() {
    let options = [];
    switch(this.ASICModel) {
        case this.eASICModel.BM1366: options = [...this.BM1366CoreVoltage]; break;
        case this.eASICModel.BM1368: options = [...this.BM1368CoreVoltage]; break;
        case this.eASICModel.BM1370: options = [...this.BM1370CoreVoltage]; break;
        case this.eASICModel.BM1397: options = [...this.BM1397CoreVoltage]; break;
        default: return [];
    }

    const currentVoltage = this.form?.get('coreVoltage')?.value;
    if (currentVoltage && !options.some(opt => opt.value === currentVoltage)) {
        options.push({
            name: `${currentVoltage} (Custom)`,
            value: currentVoltage
        });
        options.sort((a, b) => a.value - b.value);
    }

    return options;
  }
}
