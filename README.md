# ThreejsProject

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.0.2.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.


https://github.com/bbarn3y/2022-2023-2-korszeru-angular-alkalmazasok/blob/1634a0d6d4ec215e67e6c7f8fc5400505d73bce9/angular.json#L35

https://github.com/bbarn3y/2022-2023-2-korszeru-angular-alkalmazasok/blob/master/tsconfig.worker.json

https://github.com/bbarn3y/2022-2023-2-korszeru-angular-alkalmazasok/blob/master/src/app/_workers/konva.worker.ts

innentől kezdve nem angular service
csak főszálon van angular
workerben csak üzenetküldés és ts

heavy lifting - amit optimalizálni szeretnénk (threeJS)
eközött és az angular között messagekkel kommunikál

worker definiálás: https://github.com/bbarn3y/2022-2023-2-korszeru-angular-alkalmazasok/blob/1634a0d6d4ec215e67e6c7f8fc5400505d73bce9/src/app/konva/konva.component.ts#L45C1-L46C1

worker feliratkozás a messagekben a workerben kell legyen

mindkét irányba kell felirakozás
angularban: https://github.com/bbarn3y/2022-2023-2-korszeru-angular-alkalmazasok/blob/1634a0d6d4ec215e67e6c7f8fc5400505d73bce9/src/app/konva/konva.component.ts#L46C17-L46C26

workerben a felirazkozás, azokra az üzikre, amit a főszál küld: https://github.com/bbarn3y/2022-2023-2-korszeru-angular-alkalmazasok/blob/1634a0d6d4ec215e67e6c7f8fc5400505d73bce9/src/app/_workers/konva.worker.ts#L26
