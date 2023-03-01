$(document).ready(function () {
    function isValidTabId(tabId) {
        if (!tabId) return false;
        return window.dpStsValidCredentialTabs.indexOf(tabId) !== -1;
    }

    var lastTabItemName = window.dpStsVerifyMode ? 'lastMfaTab' : 'lastLoginTab';

    $(".totp-tabs").parent().wrapAll("<ul class='otp-wrapper' />");
    if ($('.otp-wrapper li a').hasClass('tab-disabled')) {
        $('.otp-wrapper li a').addClass('tab-disabled');
    } else {
        $('.otp-wrapper li a').removeClass('tab-disabled');
    }

    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        var tabId = $(this).attr('href');

        // Note: this module should not be aware of the implementation details of tab plug-ins,
        // tab activation/deactivation must be handled in the callbacks provided by the plug-ins.

        // save the last used tab and set default focus
        localStorage.setItem(lastTabItemName, tabId);

        if (tabId === "#totp_tab" || tabId === "#sms_tab" || tabId === "#push_tab" || tabId === "#email_tab") {
            $(".nav.nav-tabs > li").removeClass('active');
        }
        // set focus on first 'empty' input element        
        $(tabId).find("input:enabled:visible").filter(function () {
            return this.value.trim() == "";
        }).first().focus();
        // fire the 'set_active' event
        $(tabId).find('.cm-credential-plugin').trigger('cm:tab:set_active');
    }).on('hide.bs.tab', function(e) {
        var tabId = $(this).attr('href');
        console.log("hide.bs.tab: " + tabId);
        // fire the 'kill_active' event
        $(tabId).find('.cm-credential-plugin').trigger('cm:tab:kill_active');
        // remove focus
        $(document.activeElement).blur();
        $(".otp-wrapper li").removeClass('active');
    });
    $('.otp-wrapper').on('hide.bs.tab', function (e) {
        $(this).trigger('cm:tab:kill_active');
        $(".nav.nav-tabs li").removeClass('active');
    });
    $(window).bind('hashchange', function () {
        var tabId;
        if (window.location.hash) {
            tabId = window.location.hash.replace('#/', '#');
        } else {
            tabId = $('.cm-default-tab').attr('href');
            if (!tabId) {
                tabId = $('a[data-toggle="tab"]:first').attr('href');
            }
        }
        if (isValidTabId(tabId)) {
            $('[href="' + tabId + '"]').tab('show');
        }
    });
    // activate default tab, if specified, otherwise, activate the last used tab, if it exists, otherwise activate the first tab
    var defaultTabId;
    if (window.location.hash) {
        defaultTabId = window.location.hash.replace('#/', '#');
    } else {
        defaultTabId = $('.cm-default-tab').attr('href');
    }
    if (isValidTabId(defaultTabId)) {
        localStorage.setItem(lastTabItemName, defaultTabId);
    } else {
        defaultTabId = localStorage.getItem(lastTabItemName);
        if (isValidTabId(defaultTabId)) {
            $('[href="' + defaultTabId + '"]').addClass('cm-default-tab');
            defaultTabId = $('.cm-default-tab').attr('href');
        } else {
            defaultTabId = null;
        }
    }
    if (isValidTabId(defaultTabId) && $('[href="' + defaultTabId + '"]').length) {
        $('[href="' + defaultTabId + '"]').tab('show');
    } else {
        var firstTabId = $('a[data-toggle="tab"]:first').attr('href');
        if (firstTabId) {
            $('[href="' + firstTabId + '"]').tab('show');
        }
    }
});  

function beginMonitoringFields(usernameId, passwordId) {
    if (!window.dpStsCollectBehaviorData) {
        return;
    }
    var usernameMonitored = false;
    var passwordMonitored = false;
    if (usernameId != null) {
        $(document).on('keypress', 'input[id=' + usernameId + '],textarea', function (e) {
            if (usernameMonitored == false) {
                continuousAuth.monitorField(usernameId);
                usernameMonitored = true;
            }
        });
    }
    if (passwordId != null) {
        $(document).on('keypress', 'input[id=' + passwordId + '],textarea', function (e) {
            if (passwordMonitored == false) {
                continuousAuth.monitorField(passwordId);
                passwordMonitored = true;
            }
        });
    }
}

(function () {
    "use strict";

    angular
        .module("app")
        .filter("encodeURIComponent", function ($window) {
            return function (input) {
                var out = "";
                if (input) {
                    out = $window.encodeURIComponent(input);
                }
                return out;
            };
        });

    angular.module("app").filter("AltusLoginFilter", function () {
        return function (input) {
            var out = "";
            if (input && (input.length > 0)) {
                out = "col-md-6 col-sm-6";
            } else {
                out = "col-md-8 col-md-offset-2 col-sm-12 col-sm-offset-0";
            }
            return out;
        };
    });

    angular.module("app").directive('credentialTab', ['Model', 'ExtraData', '$timeout', function (Model, ExtraData, $timeout) {
        
        var linker = function (scope, element, attrs) {

            console.log("credenialTab: link: " + scope.credentialName);
            scope.model = Model;
            scope.extraData = ExtraData;

            scope.deviceFp = "";

            scope.getDeviceFp = function () {
                if (!scope.deviceFp) {
                    var optionsFP = {
                        excludePixelRatio: true,
                        excludeScreenResolution: true,
                        excludeAvailableScreenResolution: true,
                        excludeTimezoneOffset: true,
                        excludeOpenDatabase: true,
                        excludeCpuClass: true,
                        excludeAdBlock: true,
                        excludeHasLiedLanguages: true,
                        excludeHasLiedResolution: true,
                        excludeHasLiedOs: true,
                        excludeHasLiedBrowser: true,
                        excludeDoNotTrack: true,
                        excludeIndexedDB: true,
                        excludeJsFonts: true
                    };
                    new Fingerprint2(optionsFP).get(function (result, components) {
                        scope.deviceFp = result;
                    });
                }
                return scope.deviceFp;
            };

            scope.getUserPlatform = function () {
                var browser_name = '';
                var isIE = /*@cc_on!@*/false || !!document.documentMode;
                var isEdge = !isIE && !!window.StyleMedia;
                if (navigator.userAgent.indexOf("Chrome") != -1 && !isEdge) { browser_name = 'chrome'; }
                else if (navigator.userAgent.indexOf("Safari") != -1 && !isEdge) { browser_name = 'safari'; }
                else if (navigator.userAgent.indexOf("Firefox") != -1) { browser_name = 'firefox'; }
                else if ((navigator.userAgent.indexOf("MSIE") != -1) || (!!document.documentMode == true)) { browser_name = 'ie'; }
                else if (isEdge) { browser_name = 'edge'; }
                else { browser_name = 'other'; }
                var _to_check = [];
                if (window.navigator.cpuClass) _to_check.push((window.navigator.cpuClass + "").toLowerCase());
                if (window.navigator.platform) _to_check.push((window.navigator.platform + "").toLowerCase());
                if (navigator.userAgent) _to_check.push((navigator.userAgent + "").toLowerCase());

                var _64bits_signatures = ["x86_64", "x86-64", "Win64", "x64;", "amd64", "AMD64", "WOW64", "x64_64", "ia64", "sparc64", "ppc64", "IRIX64"];
                var _bits = 32, _i, _c;
                outer_loop:
                for (var _c = 0; _c < _to_check.length; _c++) {
                    for (_i = 0; _i < _64bits_signatures.length; _i++) {
                        if (_to_check[_c].indexOf(_64bits_signatures[_i].toLowerCase()) != -1) {
                            _bits = 64;
                            break outer_loop;
                        }
                    }
                }

                if ((_bits == '32' || _bits == '64') && (browser_name == "chrome" || browser_name == "firefox" || browser_name == "ie" || browser_name == "edge")) {
                    return _bits;
                }
                else {
                    return 'other';
                }
            };

            scope.isMobile = function (ignorePlatform) {
                if ((!ignorePlatform && (scope.getUserPlatform() == 'other')) || /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
                    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4))) {
                    return true;
                } else {
                    return false;
                }
            };

            scope.submitData = function (userName, credentialData, tokenId) {
                var behavioData = (scope.extraData.collectBehaviorData === "true") ? continuousAuth.getBehavioData(false) : "[]";
                credentialData = credentialData + "|" + scope.getDeviceFp() + "|" + behavioData;
                if (typeof tokenId === 'undefined') {
                    tokenId = scope.credentialId;
                }
                $('#login_credential').val(tokenId + "|" + credentialData);
                if (userName == null || userName == "") {
                    userName = '*';
                }
                $('#login_username').val(userName);
                $('#login_isCancel').val(false);
                scope.model.isSubmitting = true;
                $('#login_form').submit();
            };

            scope.cancelLogin = function (userName) {
                if (userName == null || userName == "") {
                    userName = '*';
                }
                $('#login_username').val(userName);
                $('#login_isCancel').val(true);
                $('#login_form').submit();
            };

            scope.displayError = function (isValid, keyCode) {
                if (isValid && keyCode == '13') {
                    var msg = "errorInvalidUser";
                    scope.model.errorMessage = msg;
                }
            };

            function resetError() {
                $timeout(function () {
                    scope.model.errorMessage = null;
                });
            }

            scope.initializePlugin = function (activationHandler, deactivationHandler) {
                var $tab = $('credential-tab[credential-id="' + scope.credentialId + '"]'),
                    $plugin = $tab.find('.cm-credential-plugin');

                $plugin.on('cm:tab:kill_active', resetError);

                if (activationHandler && deactivationHandler) {
                    $plugin
                        .on('cm:tab:set_active', activationHandler)
                        .on('cm:tab:kill_active', deactivationHandler);
                }

                if ($tab.closest('.tab-pane').hasClass('active')) {
                    $tab.find('.cm-credential-plugin')
                        .trigger('cm:tab:set_active');
                }

                $timeout(function () {
                    $tab.find("input:enabled:visible").filter(function () {
                        return this.value.trim() == "";
                    }).first().focus();
                }, 100);
            };
        };

        return {
            restrict: 'E',
            scope: {
                credentialId: '@',
                credentialName: '@',
                contentUrl: '@templateUrl',
                serviceUrl: '@',
                isVerified: '@'
            },
            link: linker,
            template: '<div ng-include="contentUrl"></div>'
        };
    }]);

    angular.module("app").config(configureLogin);

    configureLogin.$inject = ['Model', 'Credentials', 'ExtraData'];
    function configureLogin(Model, Credentials, ExtraData) {
        window.dpStsVerifyMode = ('verifyMode' in Model) && Model.verifyMode;
        window.dpStsCollectBehaviorData = ExtraData.collectBehaviorData === "true";
        window.dpStsValidCredentialTabs = [];
        Credentials.forEach(function (item) { window.dpStsValidCredentialTabs.push('#' + item.name + '_tab');});
    }
})();
